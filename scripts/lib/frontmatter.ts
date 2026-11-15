import { parse } from "yaml";
import type { LicenseStatus } from "../../src/lib/schema";

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  body: string;
  error?: string;
}

export interface NormalizedFrontmatter {
  name?: string;
  description?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
}

export function parseSkillMd(raw: string): ParsedFrontmatter {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  try {
    const data = parse(match[1] ?? "");
    return {
      data: data && typeof data === "object" ? (data as Record<string, unknown>) : {},
      body: match[2] ?? "",
    };
  } catch (error) {
    // Many skills use unquoted colons in description. Keep a small fallback
    // instead of dropping the skill entirely.
    const data: Record<string, unknown> = {};
    for (const line of (match[1] ?? "").split(/\r?\n/)) {
      const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (field) data[field[1]!] = field[2]!.replace(/^["']|["']$/g, "");
    }
    return {
      data,
      body: match[2] ?? "",
      error: error instanceof Error ? error.message : "Invalid YAML",
    };
  }
}

export function normalizeFrontmatter(data: Record<string, unknown>): NormalizedFrontmatter {
  const asString = (value: unknown): string | undefined => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return undefined;
  };

  const metadata: Record<string, string> = {};
  if (data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)) {
    for (const [key, value] of Object.entries(data.metadata as Record<string, unknown>)) {
      if (value === null || value === undefined) continue;
      metadata[key] =
        typeof value === "object" ? JSON.stringify(value) : String(value);
    }
  }

  return {
    name: asString(data.name),
    description: asString(data.description),
    license: asString(data.license),
    compatibility: asString(data.compatibility),
    metadata: Object.keys(metadata).length ? metadata : undefined,
    allowedTools: asString(data["allowed-tools"]) ?? asString(data.allowed_tools),
  };
}

const PERMISSIVE = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "0BSD",
  "Unlicense",
  "CC0-1.0",
  "CC-BY-4.0",
  "WTFPL",
  "Zlib",
]);

const COPYLEFT = new Set([
  "GPL-2.0",
  "GPL-3.0",
  "AGPL-3.0",
  "LGPL-2.1",
  "LGPL-3.0",
  "MPL-2.0",
  "EPL-2.0",
  "EUPL-1.1",
  "CC-BY-SA-4.0",
]);

function normalizeLicense(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const key = trimmed.toLowerCase().replace(/\s+/g, "-");
  const aliases: Record<string, string> = {
    mit: "MIT",
    "mit-license": "MIT",
    apache: "Apache-2.0",
    "apache-2": "Apache-2.0",
    "apache-2.0": "Apache-2.0",
    "apache-license-2.0": "Apache-2.0",
    "bsd-2-clause": "BSD-2-Clause",
    "bsd-3-clause": "BSD-3-Clause",
    isc: "ISC",
    "mpl-2.0": "MPL-2.0",
    "gpl-2.0": "GPL-2.0",
    "gpl-3.0": "GPL-3.0",
    "agpl-3.0": "AGPL-3.0",
    "lgpl-2.1": "LGPL-2.1",
    "lgpl-3.0": "LGPL-3.0",
    unlicense: "Unlicense",
    "cc0-1.0": "CC0-1.0",
    "cc-by-4.0": "CC-BY-4.0",
    "cc-by-sa-4.0": "CC-BY-SA-4.0",
  };
  return aliases[key] ?? trimmed;
}

export interface LicenseDecision {
  spdx: string | null;
  status: LicenseStatus;
  source: "repo" | "frontmatter" | "none" | "conflict" | "author";
}

export function decideLicense(
  repoSpdx: string | null,
  frontmatterLicense?: string,
): LicenseDecision {
  const repo = normalizeLicense(repoSpdx);
  const front = normalizeLicense(frontmatterLicense);

  if (repo && front && repo.toLowerCase() !== front.toLowerCase()) {
    return { spdx: repo, status: "conflict", source: "conflict" };
  }

  const value = repo ?? front;
  if (!value) return { spdx: null, status: "unknown", source: "none" };

  if (PERMISSIVE.has(value)) return { spdx: value, status: "permissive", source: repo ? "repo" : "frontmatter" };
  if (COPYLEFT.has(value)) return { spdx: value, status: "copyleft", source: repo ? "repo" : "frontmatter" };
  return { spdx: value, status: "unknown", source: repo ? "repo" : "frontmatter" };
}

const TOPIC_RULES: { topic: string; pattern: RegExp }[] = [
  { topic: "design", pattern: /\bdesign\b|\bui\b|\binterface\b|\bvisual\b/i },
  { topic: "frontend", pattern: /\bfront-?end\b|\breact\b|\bnext\.?js\b|\bcomponent\b/i },
  { topic: "testing", pattern: /\btest(?:ing|s)?\b|\btdd\b|\bcoverage\b|\bflaky\b/i },
  { topic: "debugging", pattern: /\bdebug(?:ging)?\b|\bdiagnos\w*\b|\broot cause\b/i },
  { topic: "docs", pattern: /\bdocs?\b|\bdocumentation\b|\bpdf\b|\bword\b|\bspreadsheet\b|\bwriting\b|\bmarkdown\b/i },
  { topic: "database", pattern: /\bdatabase\b|\bpostgres\w*\b|\bprisma\b|\bsupabase\b|\bsql\b/i },
  { topic: "video", pattern: /\bvideo\b|\bremotion\b/i },
  { topic: "browser", pattern: /\bbrowser\b|\bplaywright\b/i },
  { topic: "code-review", pattern: /\bcode review\b|\breview\b|\bpull request\b|\bmerge\b/i },
  { topic: "architecture", pattern: /\barchitecture\b|\brefactor\w*\b|\bstructure\b/i },
  { topic: "agent-workflows", pattern: /\bagents?\b|\bworkflows?\b|\bprompt engineering\b/i },
  { topic: "planning", pattern: /\bplans?\b|\bplanning\b|\bspecs?\b|\broadmap\b/i },
  { topic: "performance", pattern: /\bperformance\b|\bweb vitals\b|\blatency\b|\bcach(?:e|ing)\b/i },
  { topic: "deployment", pattern: /\bdeploy\w*\b|\bvercel\b|\bci\/cd\b/i },
];

export function inferTopics(name: string, description: string, skillPath: string): string[] {
  const text = `${name} ${description} ${skillPath}`;
  return TOPIC_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.topic);
}

export function inferScenes(topics: string[]): string[] {
  const scenes = new Set<string>();
  if (topics.includes("testing")) scenes.add("add-tests");
  if (topics.includes("debugging")) {
    scenes.add("add-tests");
    scenes.add("inherit-codebase");
  }
  if (topics.includes("design") || topics.includes("frontend")) scenes.add("design-to-code");
  if (
    topics.includes("code-review") ||
    topics.includes("browser") ||
    topics.includes("deployment") ||
    topics.includes("performance")
  ) {
    scenes.add("ship-safely");
  }
  if (topics.includes("architecture")) {
    scenes.add("inherit-codebase");
    scenes.add("ship-safely");
  }
  if (topics.includes("docs") || topics.includes("planning")) scenes.add("write-clearly");
  return [...scenes];
}

export function inferShelves(input: {
  official: boolean;
  topics: string[];
  scenes: string[];
  size: number;
}): string[] {
  const shelves = new Set<string>();
  if (input.official) shelves.add("official");
  if (input.size <= 3500) shelves.add("small-and-readable");
  if (input.topics.includes("design") || input.topics.includes("frontend")) {
    shelves.add("design-systems");
  }
  if (input.topics.includes("testing") || input.topics.includes("debugging")) {
    shelves.add("testing");
  }
  if (input.topics.includes("docs")) shelves.add("docs-and-data");
  if (input.topics.includes("code-review") || input.topics.includes("architecture")) {
    shelves.add("code-quality");
  }
  return [...shelves];
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "skill";
}
