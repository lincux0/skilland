import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  RepoFileSchema,
  ReviewRecordSchema,
  type RepoFile,
  type ReviewRecord,
  type SkillRecord,
  type SkillSeed,
} from "./schema";

const DATA_ROOT = path.join(process.cwd(), "data", "repos");
const REVIEWS_FILE = path.join(process.cwd(), "data", "reviews.json");

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

function loadReviews(): Map<string, ReviewRecord> {
  if (!fs.existsSync(REVIEWS_FILE)) return new Map();
  const raw = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf8")) as unknown;
  const parsed = ReviewRecordSchema.array().safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid review file ${REVIEWS_FILE}\n${detail}`);
  }
  return new Map(parsed.data.map((record) => [record.publicId, record]));
}

function deriveReview(
  scan: SkillSeed["scan"],
  snapshot: { commit: string; bundleHash: string },
  record: ReviewRecord | undefined,
): SkillRecord["review"] {
  if (!record) {
    return {
      status: scan.status === "not-scanned" ? "unreviewed" : "machine-scanned",
      notes: "自动扫描结果，未人工复核。扫描未命中已知模式不等于安全。",
    };
  }

  const reviewed = {
    commit: record.commit,
    bundleHash: record.bundleHash,
    reviewedAt: record.reviewedAt,
    reviewer: record.reviewer,
    scope: record.scope,
    notes: record.notes,
    scan: record.scan,
    licenseStatus: record.licenseStatus,
  };

  if (record.verdict === "rejected") {
    return {
      status: "human-rejected",
      reviewed,
      notes: record.notes ?? "人工复核未通过。",
    };
  }
  if (record.bundleHash === snapshot.bundleHash) {
    return {
      status: "human-approved",
      reviewed,
      notes: record.notes ?? `已由 ${record.reviewer} 复核。`,
    };
  }
  return {
    status: "stale",
    reviewed,
    notes: `复核版本 @${record.commit.slice(0, 8)} 与当前同步版本不一致，复核已失效。`,
  };
}

function deriveVersions(
  upstream: SkillRecord["upstream"],
  snapshot: SkillRecord["snapshot"],
  scan: SkillSeed["scan"],
  review: SkillRecord["review"],
  installCommit: string,
  catalog: SkillRecord["catalog"],
): SkillRecord["versions"] {
  const reviewed = review.reviewed;
  return {
    upstream: { commit: upstream.latestCommit, at: upstream.latestCommitAt },
    synced: {
      commit: snapshot.commit,
      at: snapshot.syncedAt,
      bundleHash: snapshot.bundleHash,
    },
    scanned: {
      commit: scan.scannedCommit,
      bundleHash: scan.scannedBundleHash,
      status: scan.status,
      at: scan.scannedAt,
    },
    reviewed: reviewed
      ? {
          commit: reviewed.commit,
          bundleHash: reviewed.bundleHash,
          at: reviewed.reviewedAt,
          reviewer: reviewed.reviewer,
        }
      : undefined,
    install: {
      commit: installCommit,
      source: reviewed ? "reviewed" : "synced",
    },
    catalog:
      catalog.publishedVersion && catalog.publishedBundleHash
        ? { version: catalog.publishedVersion, bundleHash: catalog.publishedBundleHash }
        : undefined,
    consistency: {
      scanMatchesSnapshot:
        scan.scannedCommit === snapshot.commit &&
        scan.scannedBundleHash === snapshot.bundleHash,
      upstreamAhead: upstream.latestCommit !== snapshot.commit,
      reviewMatchesSnapshot: reviewed
        ? reviewed.bundleHash === snapshot.bundleHash
        : null,
    },
  };
}

function deriveSkill(
  repoFile: RepoFile,
  skill: SkillSeed,
  record: ReviewRecord | undefined,
): SkillRecord {
  const { repo } = repoFile;
  const commit = skill.snapshot?.commit ?? repo.headCommit;
  const bundleHash =
    skill.snapshot?.bundleHash ?? sampleHash(repo.fullName, commit, skill.path, "bundle");
  const skillMdHash =
    skill.snapshot?.skillMdHash ?? sampleHash(repo.fullName, commit, skill.path, "skill-md");
  const size = skill.files.reduce((sum, file) => sum + file.size, 0);
  const pinned = `${repo.fullName}@${commit}`;
  const base = `npx skills add ${pinned} --skill "${skill.name}"`;
  const source = {
    ...repo,
    licenseSpdx: skill.license?.spdx ?? repo.licenseSpdx,
    licenseStatus: skill.license?.status ?? repo.licenseStatus,
    licenseSource: skill.license?.source ?? "repo",
  };
  const snapshot = {
    commit,
    syncedAt: skill.snapshot?.syncedAt ?? skill.timestamps.lastSyncedAt,
    skillMdHash,
    bundleHash,
    filesFetched: skill.snapshot?.filesFetched ?? skill.files.length,
    filesSkipped: skill.snapshot?.filesSkipped ?? 0,
    bytesFetched: skill.snapshot?.bytesFetched ?? size,
  };
  const upstream = skill.upstream ?? {
    latestCommit: repo.headCommit,
    latestCommitAt: repo.pushedAt,
    latestTreeSha: "",
  };
  const review = deriveReview(skill.scan, snapshot, record);
  const reviewedCommit = review.reviewed?.commit;
  const installCommit = reviewedCommit ?? commit;
  const catalog = {
    eligible: false,
    packIds: [],
  };

  return {
    ...skill,
    id: `github:${repo.id}:${skill.path}`,
    publicId: `${repo.owner}/${repo.repo}/${skill.slug}`,
    source,
    upstream,
    snapshot,
    review,
    install: {
      reviewedCommand: reviewedCommit
        ? `npx skills add ${repo.fullName}@${reviewedCommit} --skill "${skill.name}" -a opencode`
        : undefined,
      latestCommand: `${base} -a opencode`,
      useCommand: `npx skills use ${repo.fullName}@${installCommit} --skill "${skill.name}"`,
      targetDirs: AGENT_DIRS,
      notes: [
        reviewedCommit
          ? "已复核命令固定到最近一次人工复核的 commit。"
          : "当前没有人工复核版本，命令固定到本次同步的 commit。",
        "临时使用不是沙箱；agent 仍拥有正常的文件、网络和命令权限。",
      ],
    },
    catalog,
    versions: deriveVersions(upstream, snapshot, skill.scan, review, installCommit, catalog),
  };
}

let cachedSkills: SkillRecord[] | undefined;

export function getAllSkills(): SkillRecord[] {
  if (cachedSkills) return cachedSkills;
  const reviews = loadReviews();
  const records = loadRepoFiles()
    .flatMap((repoFile) =>
      repoFile.skills.map((skill) =>
        deriveSkill(
          repoFile,
          skill,
          reviews.get(`${repoFile.repo.owner}/${repoFile.repo.repo}/${skill.slug}`),
        ),
      ),
    )
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
    complete: skills.filter((skill) => skill.scan.status === "complete").length,
    partial: skills.filter((skill) => skill.scan.status === "partial").length,
    flagged: skills.filter((skill) => skill.scan.flags.length > 0).length,
  };
}
