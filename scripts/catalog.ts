import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { getAllSkills } from "../src/lib/skills";
import type { SkillRecord } from "../src/lib/schema";

const ROOT = path.join(process.cwd(), "catalog-src");
const PUBLIC = path.join(process.cwd(), "public", "catalog");
const LICENSE_CANDIDATES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING", "COPYING.md"];

interface Pack {
  id: string;
  title: string;
  titleZh: string;
  descriptionZh: string;
  skills: string[];
}

interface LockSkill {
  name: string;
  publicId: string;
  version: string;
  source: { repo: string; commit: string; path: string };
  bundleHash: string;
  files: string[];
  extraFiles: string[];
  license: { spdx: string; status: string; file: string };
  review: {
    reviewer: string;
    reviewedAt: string;
    commit: string;
    bundleHash: string;
    scope: string[];
  };
}

interface Lock {
  packId: string;
  title: string;
  titleZh: string;
  descriptionZh: string;
  version: string;
  generatedAt: string;
  tier: "reviewed";
  skills: LockSkill[];
}

function readPack(packId: string): Pack {
  const file = path.join(ROOT, packId, "pack.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as Pack;
}

function packIds(): string[] {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(ROOT, entry.name, "pack.json")))
    .map((entry) => entry.name)
    .sort();
}

/** Mirrors scripts/sync.ts hashFiles() so the catalog hash equals the reviewed bundle hash. */
function hashBundle(files: { path: string; content: Buffer }[]): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(String(file.content.length));
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function versionOf(bundleHash: string, license: Buffer, reviewedAt: string) {
  const digest = createHash("sha256").update(bundleHash).update(license).digest("hex");
  return `${reviewedAt.slice(0, 10)}-${digest.slice(0, 8)}`;
}

function skillDirOf(skill: SkillRecord): string {
  return path.posix.dirname(skill.path);
}

function requireSkill(publicId: string): SkillRecord {
  const skill = getAllSkills().find((item) => item.publicId === publicId);
  if (!skill) throw new Error(`unknown skill in pack: ${publicId}`);
  return skill;
}

function requireReviewed(skill: SkillRecord): NonNullable<SkillRecord["review"]["reviewed"]> {
  if (skill.review.status !== "human-approved" || !skill.review.reviewed) {
    throw new Error(
      `${skill.publicId}: pack members must be human-approved at the current snapshot (status: ${skill.review.status})`,
    );
  }
  return skill.review.reviewed;
}

async function fetchText(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchLicense(repo: string, commit: string): Promise<{ name: string; content: Buffer }> {
  for (const name of LICENSE_CANDIDATES) {
    const response = await fetch(`https://raw.githubusercontent.com/${repo}/${commit}/${name}`);
    if (response.ok) return { name, content: Buffer.from(await response.arrayBuffer()) };
  }
  throw new Error(`${repo}@${commit.slice(0, 8)}: no license file found`);
}

async function vendor(packId: string) {
  const pack = readPack(packId);
  const packDir = path.join(ROOT, packId);
  const skills: LockSkill[] = [];

  for (const publicId of pack.skills) {
    const skill = requireSkill(publicId);
    const reviewed = requireReviewed(skill);
    const commit = skill.snapshot.commit;
    const dir = skillDirOf(skill);
    const outDir = path.join(packDir, skill.slug);
    fs.rmSync(outDir, { recursive: true, force: true });

    const files: { path: string; content: Buffer }[] = [];
    for (const entry of skill.files) {
      if (entry.kind === "binary" || entry.kind === "archive" || entry.kind === "symlink") {
        throw new Error(`${skill.publicId}: ${entry.path} is ${entry.kind}; catalog packs must be text-only`);
      }
      const url = `https://raw.githubusercontent.com/${skill.source.fullName}/${commit}/${dir}/${entry.path}`;
      const content = await fetchText(url);
      if (content.length !== entry.size) {
        throw new Error(`${skill.publicId}: ${entry.path} size ${content.length} != recorded ${entry.size}`);
      }
      files.push({ path: entry.path, content });
      const target = path.join(outDir, entry.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }

    const bundleHash = hashBundle(files);
    if (bundleHash !== skill.snapshot.bundleHash || bundleHash !== reviewed.bundleHash) {
      throw new Error(
        `${skill.publicId}: recomputed bundle ${bundleHash.slice(0, 10)} != snapshot ${skill.snapshot.bundleHash.slice(0, 10)} / reviewed ${reviewed.bundleHash.slice(0, 10)}`,
      );
    }

    const license = await fetchLicense(skill.source.fullName, commit);
    fs.writeFileSync(path.join(outDir, license.name), license.content);

    skills.push({
      name: skill.slug,
      publicId: skill.publicId,
      version: versionOf(bundleHash, license.content, reviewed.reviewedAt),
      source: { repo: skill.source.fullName, commit, path: dir },
      bundleHash,
      files: skill.files.map((entry) => entry.path).sort(),
      extraFiles: [license.name],
      license: {
        spdx: skill.source.licenseSpdx ?? "unknown",
        status: skill.source.licenseStatus,
        file: license.name,
      },
      review: {
        reviewer: reviewed.reviewer,
        reviewedAt: reviewed.reviewedAt,
        commit: reviewed.commit,
        bundleHash: reviewed.bundleHash,
        scope: reviewed.scope,
      },
    });

    console.log(`vendored ${skill.publicId} (${files.length} files, ${license.name})`);
  }

  const lock: Lock = {
    packId: pack.id,
    title: pack.title,
    titleZh: pack.titleZh,
    descriptionZh: pack.descriptionZh,
    version: `${new Date().toISOString().slice(0, 10)}-${createHash("sha256")
      .update(skills.map((item) => item.version).join(":"))
      .digest("hex")
      .slice(0, 8)}`,
    generatedAt: new Date().toISOString(),
    tier: "reviewed",
    skills,
  };

  fs.writeFileSync(path.join(packDir, "catalog.lock.json"), `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  console.log(`\nwrote catalog-src/${packId}/catalog.lock.json (${skills.length} skills)`);
}

function readLock(packId: string): Lock {
  return JSON.parse(fs.readFileSync(path.join(ROOT, packId, "catalog.lock.json"), "utf8")) as Lock;
}

function build(packId: string) {
  const lock = readLock(packId);
  if (lock.skills.length < 1 || lock.skills.length > 12) {
    throw new Error(`${packId}: pack must contain 1-12 skills (found ${lock.skills.length})`);
  }

  const names = new Set<string>();
  const outPack = path.join(PUBLIC, packId);
  fs.rmSync(outPack, { recursive: true, force: true });

  for (const entry of lock.skills) {
    if (names.has(entry.name)) throw new Error(`${packId}: duplicate skill name ${entry.name}`);
    names.add(entry.name);

    if (!entry.files.includes("SKILL.md") && !entry.files.includes(`${entry.name}.md`)) {
      throw new Error(`${entry.publicId}: entry file SKILL.md (or ${entry.name}.md) missing`);
    }
    for (const file of [...entry.files, ...entry.extraFiles]) {
      if (path.isAbsolute(file) || file.includes("..") || /[?#]/.test(file)) {
        throw new Error(`${entry.publicId}: unsafe file path ${file}`);
      }
    }

    const sourceDir = path.join(ROOT, packId, entry.name);
    const files = entry.files.map((file) => {
      const full = path.join(sourceDir, file);
      if (!fs.existsSync(full)) throw new Error(`${entry.publicId}: missing ${file}`);
      return { path: file, content: fs.readFileSync(full) };
    });
    const bundleHash = hashBundle(files);
    if (bundleHash !== entry.bundleHash) {
      throw new Error(`${entry.publicId}: catalog-src bundle ${bundleHash.slice(0, 10)} != lock ${entry.bundleHash.slice(0, 10)}`);
    }

    const skill = requireSkill(entry.publicId);
    const reviewed = requireReviewed(skill);
    if (reviewed.bundleHash !== entry.bundleHash || skill.snapshot.bundleHash !== entry.bundleHash) {
      throw new Error(`${entry.publicId}: catalog bundle is not the reviewed / current bundle`);
    }

    const target = path.join(outPack, entry.name);
    fs.mkdirSync(target, { recursive: true });
    for (const file of [...entry.files, ...entry.extraFiles]) {
      const source = path.join(sourceDir, file);
      if (!fs.existsSync(source)) throw new Error(`${entry.publicId}: missing extra file ${file}`);
      const destination = path.join(target, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
  }

  const index = {
    skills: lock.skills.map((entry) => ({
      name: entry.name,
      version: entry.version,
      files: [...entry.files, ...entry.extraFiles].sort(),
    })),
  };
  fs.mkdirSync(outPack, { recursive: true });
  fs.writeFileSync(path.join(outPack, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  fs.copyFileSync(path.join(ROOT, packId, "catalog.lock.json"), path.join(outPack, "catalog.lock.json"));
  console.log(`built public/catalog/${packId}/ (${lock.skills.length} skills, version ${lock.version})`);
}

const [command, packArg] = process.argv.slice(2);
const ids = packArg ? [packArg] : packIds();

if (ids.length === 0) {
  console.log("no catalog packs found under catalog-src/");
  process.exit(0);
}

if (command === "vendor") {
  for (const id of ids) await vendor(id);
} else if (command === "build") {
  for (const id of ids) build(id);
} else {
  console.error("usage: tsx scripts/catalog.ts <vendor|build> [packId]");
  process.exit(1);
}
