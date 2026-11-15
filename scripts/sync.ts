import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { x as extractTar } from "tar";
import {
  RepoFileSchema,
  type RepoFile,
  type SkillSeed,
} from "../src/lib/schema";
import { backfillTranslations, describeStats } from "./lib/translate";
import {
  decideLicense,
  inferScenes,
  inferShelves,
  inferTopics,
  normalizeFrontmatter,
  parseSkillMd,
  slugFromName,
} from "./lib/frontmatter";
import {
  classifyFile,
  isLikelyText,
  scanSkill,
  type FileKind,
  type ScannableFile,
} from "./lib/scan";

const ROOT = process.cwd();
const DATA_ROOT = path.join(ROOT, "data", "repos");
const SEEDS_FILE = path.join(ROOT, "data", "seeds", "repos.json");
const REPORT_FILE = path.join(ROOT, "data", "sync-report.json");
const MAX_TARBALL_BYTES = 50 * 1024 * 1024;
const MAX_EXTRACT_BYTES = 200 * 1024 * 1024;
const MAX_EXTRACT_FILES = 10_000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SKILL_FILES = 80;

interface SeedRepo {
  owner: string;
  repo: string;
  official?: boolean;
  mode?: "tarball" | "api";
  includePrefix?: string;
  includeRoot?: boolean;
}

interface TreeEntry {
  path: string;
  type: string;
  size?: number;
  sha: string;
}

interface RepoMeta {
  id: number;
  full_name: string;
  stargazers_count: number;
  license: { spdx_id: string | null } | null;
  default_branch: string;
  archived: boolean;
  pushed_at: string;
}

interface CommitMeta {
  sha: string;
  commit: { committer: { date: string }; tree?: { sha: string } };
}

interface TreeMeta {
  sha: string;
  truncated: boolean;
  tree: TreeEntry[];
}

interface FetchedFile {
  path: string;
  size: number;
  kind: FileKind;
  content?: Buffer;
  skipReason?: string;
}

const EXCLUDED_SEGMENTS = new Set([
  ".git",
  ".changeset",
  ".agents",
  ".claude",
  ".codex",
  "node_modules",
  "tests",
  "test",
  "examples",
  "example",
  "skill-data",
  "templates",
  "fixtures",
]);

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "skill-shelf-sync",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }
  const cause = (lastError as { cause?: { message?: string } })?.cause?.message;
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`fetch failed after ${attempts} attempts: ${message}${cause ? ` (${cause})` : ""}`);
}

async function githubJson<T>(apiPath: string): Promise<T> {
  const res = await fetchWithRetry(`https://api.github.com${apiPath}`, {
    headers: apiHeaders(),
    redirect: "follow",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} ${apiPath}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function shouldExclude(skillPath: string): boolean {
  const parts = skillPath.split("/");
  return parts.some((part) => EXCLUDED_SEGMENTS.has(part)) || parts.some((part) => part.startsWith("."));
}

function selectSkillPaths(tree: TreeEntry[], seed: SeedRepo): string[] {
  const prefix = seed.includePrefix ?? "";
  return tree
    .filter((entry) => entry.type === "blob" && entry.path.endsWith("/SKILL.md"))
    .map((entry) => entry.path)
    .filter((entryPath) => (prefix ? entryPath.startsWith(prefix) : true))
    .filter((entryPath) => {
      if (seed.includeRoot) return /^[^/]+\/SKILL\.md$/.test(entryPath);
      return prefix ? true : entryPath.split("/").length <= 5;
    })
    .filter((entryPath) => !shouldExclude(entryPath))
    .sort();
}

function walkFiles(root: string, current = root): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(root, full));
    else result.push(path.relative(root, full).split(path.sep).join("/"));
  }
  return result.sort();
}

async function downloadTarball(
  owner: string,
  repo: string,
  commit: string,
  destination: string,
): Promise<number> {
  const res = await fetchWithRetry(
    `https://api.github.com/repos/${owner}/${repo}/tarball/${commit}`,
    { headers: apiHeaders(), redirect: "follow" },
  );
  if (!res.ok) throw new Error(`tarball ${res.status}`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_TARBALL_BYTES) {
    throw new Error(`tarball too large (${length} bytes)`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_TARBALL_BYTES) {
    throw new Error(`tarball too large (${buffer.length} bytes)`);
  }
  await fsp.writeFile(destination, buffer);
  return buffer.length;
}

async function extractRepo(
  tarball: string,
  destination: string,
): Promise<{ extractedBytes: number; extractedFiles: number }> {
  let extractedBytes = 0;
  let extractedFiles = 0;
  await extractTar({
    file: tarball,
    cwd: destination,
    strip: 1,
    filter: (entryPath, entry) => {
      const normalized = entryPath.replace(/\\/g, "/");
      if (normalized.startsWith("/") || normalized.split("/").includes("..")) return false;
      const entryType = "type" in entry ? entry.type : undefined;
      if (entryType !== "File" && entryType !== "Directory") return false;
      if (entryType === "File") {
        extractedFiles += 1;
        extractedBytes += Number("size" in entry ? (entry.size ?? 0) : 0);
      }
      return extractedBytes <= MAX_EXTRACT_BYTES && extractedFiles <= MAX_EXTRACT_FILES;
    },
  });
  return { extractedBytes, extractedFiles };
}

function hashFiles(files: FetchedFile[]): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(String(file.size));
    hash.update("\0");
    hash.update(file.content ?? Buffer.from("SKIPPED"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function collectFilesFromDisk(skillDir: string): FetchedFile[] {
  const files: FetchedFile[] = [];
  for (const relative of walkFiles(skillDir).slice(0, MAX_SKILL_FILES)) {
    const full = path.join(skillDir, relative);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) {
      files.push({
        path: relative,
        size: 0,
        kind: "symlink",
        skipReason: "symlink skipped",
      });
      continue;
    }
    if (!stat.isFile()) continue;
    const kind = classifyFile(relative);
    if (kind === "archive" || kind === "asset" || kind === "binary") {
      files.push({ path: relative, size: stat.size, kind, skipReason: "binary/asset not parsed" });
      continue;
    }
    if (stat.size > MAX_FILE_BYTES) {
      files.push({ path: relative, size: stat.size, kind, skipReason: "file too large" });
      continue;
    }
    files.push({
      path: relative,
      size: stat.size,
      kind,
      content: fs.readFileSync(full),
    });
  }
  return files;
}

async function fetchRawFile(
  owner: string,
  repo: string,
  commit: string,
  filePath: string,
): Promise<Buffer | undefined> {
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  const res = await fetchWithRetry(
    `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${encoded}`,
    { headers: { "User-Agent": "skill-shelf-sync" } },
  );
  if (!res.ok) return undefined;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_FILE_BYTES) return undefined;
  return buffer;
}

async function collectFilesViaApi(
  owner: string,
  repo: string,
  commit: string,
  skillPath: string,
  tree: TreeEntry[],
): Promise<FetchedFile[]> {
  const skillDir = path.posix.dirname(skillPath);
  const entries = tree
    .filter((entry) => entry.type === "blob" && entry.path.startsWith(`${skillDir}/`))
    .slice(0, MAX_SKILL_FILES);
  const files: FetchedFile[] = [];
  for (const entry of entries) {
    const relative = entry.path.slice(skillDir.length + 1);
    const kind = classifyFile(relative);
    const size = entry.size ?? 0;
    if (kind === "archive" || kind === "asset" || kind === "binary" || size > MAX_FILE_BYTES) {
      files.push({ path: relative, size, kind, skipReason: "binary/asset or too large" });
      continue;
    }
    const content = await fetchRawFile(owner, repo, commit, entry.path);
    if (!content) {
      files.push({ path: relative, size, kind, skipReason: "raw fetch failed" });
      continue;
    }
    files.push({ path: relative, size: content.length, kind, content });
  }
  return files;
}

function getSkillMd(files: FetchedFile[]): { file: FetchedFile; text: string } | undefined {
  const file = files.find((item) => item.path === "SKILL.md");
  if (!file?.content) return undefined;
  return { file, text: file.content.toString("utf8") };
}

function oldSkillMap(): Map<string, SkillSeed> {
  const map = new Map<string, SkillSeed>();
  if (!fs.existsSync(DATA_ROOT)) return map;
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.isFile() && entry.name.endsWith(".json") ? [full] : [];
    });
  for (const file of walk(DATA_ROOT)) {
    try {
      const parsed = RepoFileSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
      if (!parsed.success) continue;
      for (const skill of parsed.data.skills) {
        map.set(`${parsed.data.repo.fullName}#${skill.path}`, skill);
      }
    } catch {
      // Ignore malformed old data; the new sync is the source of truth.
    }
  }
  return map;
}

function inferAgents(): string[] {
  return ["opencode", "claude-code", "codex", "cursor"];
}

function buildSkill(
  seed: SeedRepo,
  meta: RepoMeta,
  commit: CommitMeta,
  tree: TreeMeta,
  skillPath: string,
  files: FetchedFile[],
  old: SkillSeed | undefined,
  syncedAt: string,
  usedSlugs: Set<string>,
): SkillSeed | undefined {
  const skillMd = getSkillMd(files);
  if (!skillMd) return undefined;

  const parsed = parseSkillMd(skillMd.text);
  const fm = normalizeFrontmatter(parsed.data);
  if (!fm.name || !fm.description) return undefined;

  let slug = slugFromName(fm.name);
  if (usedSlugs.has(slug)) {
    const suffix = slugFromName(path.posix.basename(path.posix.dirname(skillPath)));
    slug = `${slug}-${suffix}`;
  }
  let counter = 2;
  while (usedSlugs.has(slug)) slug = `${slug}-${counter++}`;
  usedSlugs.add(slug);

  const license = decideLicense(meta.license?.spdx_id ?? null, fm.license);
  const bundleHash = hashFiles(files);
  const skillMdHash = createHash("sha256").update(skillMd.text).digest("hex");
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  const textFiles: ScannableFile[] = [];
  const limitations: string[] = [];
  let skipped = 0;
  let scriptCount = 0;
  const scriptFiles: string[] = [];

  for (const file of files) {
    if (file.kind === "script") {
      scriptCount += 1;
      scriptFiles.push(file.path);
    }
    if (!file.content || !isLikelyText(file.path, file.content)) {
      skipped += 1;
      if (file.kind === "archive") limitations.push(`${file.path}: archive not extracted`);
      else if (file.kind === "asset" || file.kind === "binary") limitations.push(`${file.path}: binary asset not parsed`);
      else if (file.skipReason) limitations.push(`${file.path}: ${file.skipReason}`);
      continue;
    }
    if (file.content.length > 256 * 1024) {
      limitations.push(`${file.path}: >256 KB; not scanned`);
      skipped += 1;
      continue;
    }
    textFiles.push({ path: file.path, size: file.content.length, content: file.content });
  }

  if (files.length >= MAX_SKILL_FILES) {
    limitations.push(`file list capped at ${MAX_SKILL_FILES}; some files may be omitted`);
  }
  if (limitations.length > 0) {
    skipped = Math.max(skipped, files.length - textFiles.length);
  }

  const scan = scanSkill({
    files: textFiles,
    scriptFiles,
    filesSkipped: skipped,
    limitations,
    commit: commit.sha,
    bundleHash,
    scannedAt: syncedAt,
  });

  const descriptionZh = old?.descriptionZh;
  const curated = Boolean(old?.editorial?.featuredRank);
  const oldTopics = old?.taxonomy.topics;
  const topics =
    curated && oldTopics?.length
      ? oldTopics
      : inferTopics(fm.name, fm.description, skillPath);
  const oldScenes = old?.taxonomy.scenes;
  const scenes = curated && oldScenes?.length ? oldScenes : inferScenes(topics);
  const oldShelves = old?.editorial?.shelfIds;
  const shelves =
    curated && oldShelves?.length
      ? oldShelves
      : inferShelves({
          official: Boolean(seed.official),
          topics,
          scenes,
          size: skillMd.file.size,
        });

  const reviewed = old?.review.reviewed;
  const reviewMatches = reviewed?.bundleHash === bundleHash;
  const reviewStatus = reviewMatches ? "human-approved" : "unreviewed";
  const status = reviewMatches ? "published" : "draft";

  return {
    path: skillPath,
    slug,
    name: fm.name,
    description: fm.description,
    descriptionZh,
    frontmatter: {
      license: fm.license,
      compatibility: fm.compatibility,
      metadata: fm.metadata,
      allowedTools: fm.allowedTools,
    },
    license: {
      spdx: license.spdx,
      status: license.status,
      source: license.source,
    },
    upstream: {
      latestCommit: commit.sha,
      latestCommitAt: commit.commit.committer.date,
      latestTreeSha: commit.commit.tree?.sha ?? tree.sha,
    },
    snapshot: {
      commit: commit.sha,
      syncedAt,
      skillMdHash,
      bundleHash,
      filesFetched: files.length,
      filesSkipped: skipped,
      bytesFetched: totalBytes,
    },
    files: files.map((file) => ({
      path: file.path,
      size: file.size,
      kind: file.kind,
      scanned: Boolean(file.content && isLikelyText(file.path, file.content)),
      skipReason: file.skipReason,
    })),
    metrics: {
      bodyTokensEstimate: Math.ceil(skillMd.file.size / 4),
      fileCount: files.length,
      scriptCount,
      hasNetwork: scan.flags.some((flag) =>
        ["NETWORK_FETCH", "EXTERNAL_INSTRUCTION_FETCH"].includes(flag.code),
      ),
      hasCredentialPatterns: scan.flags.some((flag) =>
        ["CREDENTIAL_ACCESS", "SECRET_PATTERN"].includes(flag.code),
      ),
    },
    scan,
    review: {
      status: reviewStatus,
      reviewed: reviewMatches ? reviewed : undefined,
      notes: reviewMatches
        ? old?.review.notes
        : "Phase 2 自动扫描；未人工复核。扫描未发现模式不代表安全。",
    },
    taxonomy: {
      scenes,
      topics,
      agents: old?.taxonomy.agents?.length ? old.taxonomy.agents : inferAgents(),
      language: old?.taxonomy.language ?? "en",
      portability: old?.taxonomy.portability ?? "unknown",
    },
    editorial: {
      shelfIds: shelves,
      noteZh: old?.editorial?.noteZh,
      noteEn: old?.editorial?.noteEn,
      featuredRank: old?.editorial?.featuredRank,
      curator: old?.editorial?.curator ?? "Skill Shelf",
    },
    status,
    timestamps: {
      firstSeenAt: old?.timestamps.firstSeenAt ?? syncedAt,
      lastSyncedAt: syncedAt,
      upstreamUpdatedAt: meta.pushed_at,
    },
  };
}

async function syncRepo(
  seed: SeedRepo,
  existing: Map<string, SkillSeed>,
): Promise<{ repoFile?: RepoFile; report: Record<string, unknown> }> {
  const fullName = `${seed.owner}/${seed.repo}`;
  const syncedAt = new Date().toISOString();
  const meta = await githubJson<RepoMeta>(`/repos/${seed.owner}/${seed.repo}`);
  const commit = await githubJson<CommitMeta>(`/repos/${seed.owner}/${seed.repo}/commits/HEAD`);
  const treeMeta = await githubJson<TreeMeta>(
    `/repos/${seed.owner}/${seed.repo}/git/trees/${commit.sha}?recursive=1`,
  );

  let skillPaths = selectSkillPaths(treeMeta.tree, seed);
  let filesBySkill = new Map<string, FetchedFile[]>();
  let tarballBytes = 0;
  let mode = seed.mode ?? "tarball";
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), "skill-shelf-"));

  try {
    if (mode === "tarball") {
      try {
        const tarball = path.join(temp, "repo.tar.gz");
        tarballBytes = await downloadTarball(seed.owner, seed.repo, commit.sha, tarball);
        const extractDir = path.join(temp, "repo");
        await fsp.mkdir(extractDir, { recursive: true });
        await extractRepo(tarball, extractDir);
        if (skillPaths.length === 0 || treeMeta.truncated) {
          const found = walkFiles(extractDir)
            .filter((entry) => entry.endsWith("/SKILL.md"))
            .filter((entry) => !shouldExclude(entry));
          skillPaths = found;
        }
        for (const skillPath of skillPaths) {
          const skillDir = path.join(extractDir, path.posix.dirname(skillPath));
          if (!skillDir.startsWith(extractDir)) continue;
          if (!fs.existsSync(skillDir)) continue;
          filesBySkill.set(skillPath, collectFilesFromDisk(skillDir));
        }
      } catch (error) {
        // Large repositories such as shadcn/ui are better served by the API.
        mode = "api";
        tarballBytes = 0;
        filesBySkill = new Map();
        if (skillPaths.length === 0) {
          throw error;
        }
      }
    }

    if (mode === "api") {
      if (skillPaths.length === 0) {
        throw new Error("no SKILL.md paths found for API mode");
      }
      for (const skillPath of skillPaths) {
        filesBySkill.set(
          skillPath,
          await collectFilesViaApi(seed.owner, seed.repo, commit.sha, skillPath, treeMeta.tree),
        );
      }
    }

    const usedSlugs = new Set<string>();
    const skills: SkillSeed[] = [];
    for (const skillPath of skillPaths) {
      const files = filesBySkill.get(skillPath);
      if (!files?.length) continue;
      const old = existing.get(`${fullName}#${skillPath}`);
      const skill = buildSkill(seed, meta, commit, treeMeta, skillPath, files, old, syncedAt, usedSlugs);
      if (skill) skills.push(skill);
    }

    const repoFile: RepoFile = {
      repo: {
        id: meta.id,
        owner: seed.owner,
        repo: seed.repo,
        fullName: meta.full_name,
        url: `https://github.com/${meta.full_name}`,
        stars: meta.stargazers_count,
        licenseSpdx: decideLicense(meta.license?.spdx_id ?? null).spdx,
        licenseStatus: decideLicense(meta.license?.spdx_id ?? null).status,
        defaultBranch: meta.default_branch,
        headCommit: commit.sha,
        archived: meta.archived,
        pushedAt: meta.pushed_at,
      },
      skills,
    };

    return {
      repoFile,
      report: {
        fullName,
        commit: commit.sha,
        mode,
        tarballBytes,
        skills: skills.length,
        treeTruncated: treeMeta.truncated,
      },
    };
  } finally {
    await fsp.rm(temp, { recursive: true, force: true });
  }
}

async function main() {
  const only = process.argv
    .find((arg) => arg.startsWith("--repo="))
    ?.slice("--repo=".length);
  const seeds = JSON.parse(fs.readFileSync(SEEDS_FILE, "utf8")) as SeedRepo[];
  const selected = only
    ? seeds.filter((seed) => `${seed.owner}/${seed.repo}` === only)
    : seeds;
  if (selected.length === 0) throw new Error(`No seed matched --repo=${only}`);

  const existing = oldSkillMap();
  const report: {
    generatedAt: string;
    repos: Record<string, unknown>[];
    errors: { repo: string; message: string }[];
    totals: Record<string, number>;
  } = {
    generatedAt: new Date().toISOString(),
    repos: [],
    errors: [],
    totals: { repos: 0, skills: 0, complete: 0, partial: 0, criticalFlags: 0 },
  };

  for (const seed of selected) {
    const fullName = `${seed.owner}/${seed.repo}`;
    try {
      const result = await syncRepo(seed, existing);
      if (!result.repoFile) continue;
      const dir = path.join(DATA_ROOT, seed.owner);
      await fsp.mkdir(dir, { recursive: true });
      const file = path.join(dir, `${seed.repo}.json`);
      const parsed = RepoFileSchema.parse(result.repoFile);
      await fsp.writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`);

      report.repos.push(result.report);
      report.totals.repos += 1;
      report.totals.skills += parsed.skills.length;
      report.totals.complete += parsed.skills.filter((skill) => skill.scan.status === "complete").length;
      report.totals.partial += parsed.skills.filter((skill) => skill.scan.status === "partial").length;
      report.totals.criticalFlags += parsed.skills.reduce(
        (sum, skill) => sum + skill.scan.flags.filter((flag) => flag.severity === "critical").length,
        0,
      );
      console.log(
        `${fullName}: ${parsed.skills.length} skills (${result.report.mode})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.errors.push({ repo: fullName, message });
      console.error(`${fullName}: ${message}`);
    }
  }

  const translationStats = await backfillTranslations({
    log: (message) => console.log(message),
  });
  report.totals.translated = translationStats.translated;
  report.totals.translationPending = translationStats.pending;
  report.totals.translationFailed = translationStats.failed;
  console.log(`\ntranslations: ${describeStats(translationStats)}`);

  await fsp.writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `\nrepos=${report.totals.repos} skills=${report.totals.skills} complete=${report.totals.complete} partial=${report.totals.partial} criticalFlags=${report.totals.criticalFlags} errors=${report.errors.length}`,
  );
  if (report.errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
