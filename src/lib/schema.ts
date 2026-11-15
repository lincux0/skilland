import { z } from "zod";

export const LicenseStatusSchema = z.enum([
  "permissive",
  "copyleft",
  "no-redistribution",
  "unknown",
  "conflict",
  "author-permission",
]);

export const ScanStatusSchema = z.enum([
  "complete",
  "partial",
  "failed",
  "not-scanned",
]);

export const ReviewStatusSchema = z.enum([
  "unreviewed",
  "machine-scanned",
  "human-approved",
  "human-rejected",
  "stale",
]);

export const PublishStatusSchema = z.enum([
  "draft",
  "published",
  "quarantined",
  "archived",
  "removed",
]);

export const RiskFlagSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["info", "warn", "high", "critical"]),
  evidence: z
    .array(
      z.object({
        file: z.string().min(1),
        line: z.number().int().positive().optional(),
        excerpt: z.string().min(1),
      }),
    )
    .default([]),
  note: z.string().optional(),
});

export const ScanCoverageSchema = z.object({
  filesScanned: z.number().int().nonnegative(),
  filesSkipped: z.number().int().nonnegative(),
  bytesScanned: z.number().int().nonnegative(),
  limitations: z.array(z.string()),
});

export const ScanResultSchema = z.object({
  status: ScanStatusSchema,
  coverage: ScanCoverageSchema,
  flags: z.array(RiskFlagSchema),
  scannerVersion: z.string().min(1),
  rulesetVersion: z.string().min(1),
  scannedAt: z.string().min(1),
  scannedCommit: z.string().min(1),
  scannedBundleHash: z.string().min(1),
});

export const RepoSchema = z.object({
  id: z.number().int().positive(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  fullName: z.string().min(1),
  url: z.url(),
  stars: z.number().int().nonnegative(),
  licenseSpdx: z.string().nullable(),
  licenseStatus: LicenseStatusSchema,
  defaultBranch: z.string().min(1),
  headCommit: z.string().min(7),
  archived: z.boolean(),
  pushedAt: z.string().min(1),
});

export const FileEntrySchema = z.object({
  path: z.string().min(1),
  size: z.number().int().nonnegative(),
  kind: z.enum([
    "skill",
    "script",
    "reference",
    "asset",
    "binary",
    "archive",
    "symlink",
    "other",
  ]),
  scanned: z.boolean(),
  skipReason: z.string().optional(),
});

export const MetricsSchema = z.object({
  bodyTokensEstimate: z.number().int().nonnegative(),
  fileCount: z.number().int().nonnegative(),
  scriptCount: z.number().int().nonnegative().nullable(),
  hasNetwork: z.boolean().nullable(),
  hasCredentialPatterns: z.boolean().nullable(),
});

export const FrontmatterSchema = z.object({
  license: z.string().optional(),
  compatibility: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  allowedTools: z.string().optional(),
});

export const ReviewSchema = z.object({
  status: ReviewStatusSchema,
  reviewed: z
    .object({
      commit: z.string().min(7),
      bundleHash: z.string().min(1),
      reviewedAt: z.string().min(1),
      reviewer: z.string().min(1),
      scope: z.array(z.string()).min(1),
      notes: z.string().optional(),
      scan: ScanResultSchema,
      licenseStatus: LicenseStatusSchema,
    })
    .optional(),
  notes: z.string().optional(),
});

export const TaxonomySchema = z.object({
  scenes: z.array(z.string()),
  topics: z.array(z.string()),
  agents: z.array(z.string()),
  language: z.enum(["en", "zh", "multi"]),
  portability: z.enum(["portable", "client-specific", "unknown"]),
});

export const EditorialSchema = z.object({
  shelfIds: z.array(z.string()),
  noteZh: z.string().optional(),
  noteEn: z.string().optional(),
  featuredRank: z.number().int().positive().optional(),
  curator: z.string().optional(),
});

export const TimestampsSchema = z.object({
  firstSeenAt: z.string().min(1),
  lastSyncedAt: z.string().min(1),
  upstreamUpdatedAt: z.string().min(1),
});

export const SkillSeedSchema = z.object({
  path: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
  name: z.string().min(1),
  description: z.string().min(1),
  descriptionZh: z.string().optional(),
  frontmatter: FrontmatterSchema.default({}),
  files: z.array(FileEntrySchema).default([]),
  metrics: MetricsSchema,
  scan: ScanResultSchema,
  review: ReviewSchema,
  taxonomy: TaxonomySchema,
  editorial: EditorialSchema.optional(),
  status: PublishStatusSchema.default("draft"),
  timestamps: TimestampsSchema,
});

export const RepoFileSchema = z.object({
  repo: RepoSchema,
  skills: z.array(SkillSeedSchema).min(1),
});

export type RepoFile = z.infer<typeof RepoFileSchema>;
export type SkillSeed = z.infer<typeof SkillSeedSchema>;
export type RepoSchemaType = z.infer<typeof RepoSchema>;

export interface InstallInfo {
  reviewedCommand?: string;
  latestCommand: string;
  useCommand: string;
  targetDirs: Record<string, { project: string; global: string }>;
  notes: string[];
}

export interface CatalogInfo {
  eligible: boolean;
  packIds: string[];
  publishedVersion?: string;
  publishedBundleHash?: string;
  publishedAt?: string;
  snapshotPath?: string;
}

export interface SnapshotInfo {
  commit: string;
  syncedAt: string;
  skillMdHash: string;
  bundleHash: string;
  filesFetched: number;
  filesSkipped: number;
  bytesFetched: number;
}

export type SkillRecord = SkillSeed & {
  id: string;
  publicId: string;
  source: RepoSchemaType;
  snapshot: SnapshotInfo;
  install: InstallInfo;
  catalog: CatalogInfo;
};
