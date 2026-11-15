import fs from "node:fs";
import path from "node:path";
import { RepoFileSchema, type SkillSeed } from "../src/lib/schema";

const root = path.join(process.cwd(), "data", "repos");

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
  }
  return files.sort();
}

const seen = new Set<string>();
const all: { file: string; repo: string; skill: SkillSeed }[] = [];
let errors = 0;

for (const file of walk(root)) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  const parsed = RepoFileSchema.safeParse(raw);
  if (!parsed.success) {
    errors++;
    console.error(`\n${path.relative(process.cwd(), file)}`);
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".") || "<root>"}: ${issue.message}`);
    }
    continue;
  }

  for (const skill of parsed.data.skills) {
    const publicId = `${parsed.data.repo.owner}/${parsed.data.repo.repo}/${skill.slug}`;
    if (seen.has(publicId)) {
      errors++;
      console.error(`Duplicate publicId: ${publicId}`);
    }
    seen.add(publicId);
    all.push({ file, repo: parsed.data.repo.fullName, skill });
  }
}

const published = all.filter((entry) => entry.skill.status === "published");
const reviewed = all.filter((entry) => entry.skill.review.status === "human-approved");
const scanned = all.filter((entry) => entry.skill.scan.status !== "not-scanned");

for (const entry of published) {
  if (!entry.skill.review.reviewed) {
    errors++;
    console.error(`Published without reviewed snapshot: ${entry.repo} ${entry.skill.name}`);
  }
}

console.log(`files: ${walk(root).length}`);
console.log(`skills: ${all.length}`);
console.log(`published: ${published.length}`);
console.log(`reviewed: ${reviewed.length}`);
console.log(`scanned: ${scanned.length}`);
console.log(`unique publicIds: ${seen.size}`);

if (errors > 0) {
  console.error(`\n${errors} validation error(s)`);
  process.exit(1);
}

console.log("\nValidation passed.");
