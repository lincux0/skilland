import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../src/lib/skills";
import {
  ReviewRecordSchema,
  type ReviewRecord,
  type ReviewScope,
} from "../src/lib/schema";

const REVIEWS_FILE = path.join(process.cwd(), "data", "reviews.json");
const ALL_SCOPES: ReviewScope[] = [
  "description",
  "file-tree",
  "scan-evidence",
  "license",
  "install-command",
];

function readRecords(): ReviewRecord[] {
  if (!fs.existsSync(REVIEWS_FILE)) return [];
  const raw = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf8")) as unknown;
  return ReviewRecordSchema.array().parse(raw);
}

function writeRecords(records: ReviewRecord[]) {
  const sorted = [...records].sort((a, b) => a.publicId.localeCompare(b.publicId));
  fs.writeFileSync(REVIEWS_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const next = process.argv[index + 1];
  if (!next || next.startsWith("--")) return "";
  return next;
}

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function list() {
  const skills = getAllSkills();
  const counts = new Map<string, number>();
  for (const skill of skills) {
    counts.set(skill.review.status, (counts.get(skill.review.status) ?? 0) + 1);
  }
  console.log(`skills: ${skills.length}`);
  for (const [status, count] of [...counts].sort()) console.log(`  ${status}: ${count}`);

  const reviewed = skills.filter((skill) => skill.review.reviewed);
  if (reviewed.length === 0) {
    console.log("\nNo review records yet.");
    return;
  }
  console.log("\npublicId\tstatus\treviewed\tcommit\tbundle");
  for (const skill of reviewed) {
    const record = skill.review.reviewed!;
    console.log(
      `${skill.publicId}\t${skill.review.status}\t${record.reviewedAt}\t${record.commit.slice(0, 8)}\t${record.bundleHash.slice(0, 10)}`,
    );
  }
}

const skillId = arg("skill");

if (process.argv.includes("--list") || !skillId) {
  list();
  process.exit(0);
}

const skills = getAllSkills();
const skill = skills.find((item) => item.publicId === skillId);
if (!skill) fail(`unknown skill: ${skillId}`);

const records = readRecords();
const existing = records.find((record) => record.publicId === skill.publicId);

if (process.argv.includes("--remove")) {
  if (!existing) fail(`no review record for ${skillId}`);
  writeRecords(records.filter((record) => record.publicId !== skillId));
  console.log(`removed review record: ${skillId}`);
  process.exit(0);
}

const reviewer = arg("reviewer");
if (!reviewer) fail("--reviewer is required (write the name that will appear on the record)");

const notes = arg("notes");
const verdict = process.argv.includes("--reject") ? "rejected" : "approved";
const scopeValue = arg("scope");
const scope = scopeValue
  ? (scopeValue.split(",").map((item) => item.trim()).filter(Boolean) as ReviewScope[])
  : ALL_SCOPES;

for (const item of scope) {
  if (!ALL_SCOPES.includes(item)) fail(`unknown scope: ${item} (allowed: ${ALL_SCOPES.join(",")})`);
}

if (verdict === "approved") {
  if (skill.scan.status === "failed") fail("cannot approve: current scan failed");
  if (skill.scan.status === "not-scanned") fail("cannot approve: skill was never scanned");
  if (skill.source.licenseStatus === "unknown" || skill.source.licenseStatus === "conflict") {
    fail(`cannot approve: license status is "${skill.source.licenseStatus}"`);
  }
}

const record: ReviewRecord = {
  publicId: skill.publicId,
  commit: skill.snapshot.commit,
  bundleHash: skill.snapshot.bundleHash,
  reviewedAt: new Date().toISOString(),
  reviewer,
  verdict,
  scope,
  notes: notes || undefined,
  scan: skill.scan,
  licenseStatus: skill.source.licenseStatus,
};

writeRecords([...records.filter((item) => item.publicId !== skill.publicId), record]);

console.log(`${existing ? "updated" : "recorded"} review: ${skill.publicId}`);
console.log(`  verdict   ${record.verdict}`);
console.log(`  commit    ${record.commit.slice(0, 8)}`);
console.log(`  bundle    ${record.bundleHash.slice(0, 10)}`);
console.log(`  reviewer  ${record.reviewer}`);
console.log(`  scope     ${record.scope.join(", ")}`);
console.log(`  scan      ${record.scan.status} (${record.scan.flags.length} flags)`);
console.log(`  license   ${skill.source.licenseSpdx ?? "unknown"} (${record.licenseStatus})`);
