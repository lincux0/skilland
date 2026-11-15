import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  RepoFileSchema,
  type RepoFile,
  type SkillRecord,
  type SkillSeed,
} from "./schema";

const DATA_ROOT = path.join(process.cwd(), "data", "repos");
const SAMPLE_REVIEW_NOTE =
  "Phase 1 sample data: file contents were not scanned and no human review was recorded.";

const AGENT_DIRS: Record<string, { project: string; global: string }> = {
  opencode: { project: ".agents/skills/", global: "~/.config/opencode/skills/" },
  "claude-code": { project: ".claude/skills/", global: "~/.claude/skills/" },
  codex: { project: ".agents/skills/", global: "~/.agents/skills/" },
  cursor: { project: ".agents/skills/", global: "~/.cursor/skills/" },
};

function walkJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
  }
  return files.sort();
}

function sampleHash(...parts: string[]): string {
  return createHash("sha256").update(parts.join(":")).digest("hex");
}

function loadRepoFiles(): RepoFile[] {
  return walkJsonFiles(DATA_ROOT).map((file) => {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    const parsed = RepoFileSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("\n");
      throw new Error(`Invalid data file ${file}\n${detail}`);
    }
    return parsed.data;
  });
}

function deriveSkill(repoFile: RepoFile, skill: SkillSeed): SkillRecord {
  const { repo } = repoFile;
  const bundleHash = sampleHash(repo.fullName, repo.headCommit, skill.path, "bundle");
  const skillMdHash = sampleHash(repo.fullName, repo.headCommit, skill.path, "skill-md");
  const size = skill.files.reduce((sum, file) => sum + file.size, 0);
  const pinned = `${repo.fullName}@${repo.headCommit}`;
  const base = `npx skills add ${pinned} --skill "${skill.name}"`;
  const use = `npx skills use ${pinned} --skill "${skill.name}"`;

  return {
    ...skill,
    id: `github:${repo.id}:${skill.path}`,
    publicId: `${repo.owner}/${repo.repo}/${skill.slug}`,
    source: repo,
    snapshot: {
      commit: repo.headCommit,
      syncedAt: skill.timestamps.lastSyncedAt,
      skillMdHash,
      bundleHash,
      filesFetched: skill.files.length,
      filesSkipped: 0,
      bytesFetched: size,
    },
    install: {
      latestCommand: `${base} -a opencode`,
      useCommand: use,
      targetDirs: AGENT_DIRS,
      notes: [
        "Phase 1 样例：命令固定到 commit，但还没有已复核版本。",
        "临时使用不是沙箱；agent 仍拥有正常的文件、网络和命令权限。",
      ],
    },
    catalog: {
      eligible: false,
      packIds: [],
    },
  };
}

let cachedSkills: SkillRecord[] | undefined;

export function getAllSkills(): SkillRecord[] {
  if (cachedSkills) return cachedSkills;
  const records = loadRepoFiles()
    .flatMap((repoFile) => repoFile.skills.map((skill) => deriveSkill(repoFile, skill)))
    .filter((skill) => skill.status !== "removed")
    .sort((a, b) => {
      const rankA = a.editorial?.featuredRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.editorial?.featuredRank ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB || a.name.localeCompare(b.name);
    });
  cachedSkills = records;
  return records;
}

export function getSkillByPublicId(publicId: string): SkillRecord | undefined {
  return getAllSkills().find((skill) => skill.publicId === publicId);
}

export function getSkillsForShelf(shelfId: string, limit = 8): SkillRecord[] {
  return getAllSkills()
    .filter((skill) => skill.editorial?.shelfIds.includes(shelfId))
    .slice(0, limit);
}

export function getSkillsForScene(sceneId: string, limit = 6): SkillRecord[] {
  return getAllSkills()
    .filter((skill) => skill.taxonomy.scenes.includes(sceneId))
    .slice(0, limit);
}

export function getFeaturedSkills(limit = 5): SkillRecord[] {
  return getAllSkills()
    .filter((skill) => typeof skill.editorial?.featuredRank === "number")
    .slice(0, limit);
}

export function getStats() {
  const skills = getAllSkills();
  return {
    total: skills.length,
    published: skills.filter((skill) => skill.status === "published").length,
    draft: skills.filter((skill) => skill.status === "draft").length,
    reviewed: skills.filter((skill) => skill.review.status === "human-approved").length,
    scanned: skills.filter((skill) => skill.scan.status !== "not-scanned").length,
  };
}

export { SAMPLE_REVIEW_NOTE };
