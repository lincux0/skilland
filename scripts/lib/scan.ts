import path from "node:path";
import type { RiskFlag, ScanResult } from "../../src/lib/schema";

export const SCANNER_VERSION = "2.0.0";
export const RULESET_VERSION = "2.0.0";
export const MAX_SCAN_FILES = 50;
export const MAX_SCAN_FILE_BYTES = 256 * 1024;
export const MAX_SCAN_TOTAL_BYTES = 2 * 1024 * 1024;

interface Rule {
  code: string;
  severity: RiskFlag["severity"];
  pattern: RegExp;
  note: string;
}

const RULES: Rule[] = [
  {
    code: "EXEC_CURL_PIPE",
    severity: "critical",
    pattern: /\b(?:curl|wget)\b[^\n|]{0,240}(?:https?:\/\/|-\S+)[^\n|]{0,240}\|\s*(?:bash|sh|zsh)\b/i,
    note: "Downloads and pipes remote content into a shell.",
  },
  {
    code: "BASE64_EXEC",
    severity: "critical",
    pattern: /base64\s+(?:-d|--decode)[^\n]{0,120}(?:\||;|&&)[^\n]{0,80}\b(?:bash|sh|zsh|eval)\b/i,
    note: "Decodes base64 and executes it.",
  },
  {
    code: "REMOTE_INSTRUCTIONS",
    severity: "critical",
    pattern: /(?:curl|wget)[^\n]{0,240}https?:\/\/[^\n]{0,240}\|\s*(?:source|\.)\b|eval\s*\(?\s*\$?\(\s*(?:curl|wget)[^\n]{0,240}https?:\/\//i,
    note: "Loads remote content as instructions or shell code.",
  },
  {
    code: "CREDENTIAL_ACCESS",
    severity: "high",
    pattern: /(?:~\/\.aws|~\/\.ssh|~\/\.config\/gcloud|(?:^|[^.\w])\.env\b|\.netrc|\.npmrc|keychain|credentials)/i,
    note: "References credential files or secret stores.",
  },
  {
    code: "NETWORK_FETCH",
    severity: "medium",
    pattern: /\b(?:https?:\/\/|fetch\s*\(|requests\.|curl\b|wget\b)/i,
    note: "Mentions network access or a network tool.",
  },
  {
    code: "PRIVILEGE_ESCALATION",
    severity: "high",
    pattern: /\b(?:sudo|chmod\s+\+x|systemctl|launchctl|reg\s+add)\b/i,
    note: "Requests elevated or persistent system changes.",
  },
  {
    code: "HIDDEN_UNICODE",
    severity: "high",
    pattern: /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/,
    note: "Contains zero-width or bidirectional control characters.",
  },
  {
    code: "PROMPT_INJECTION_PATTERN",
    severity: "high",
    pattern: /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|system\s+prompt|developer\s+mode|jailbreak|\bDAN\b/i,
    note: "Contains prompt-injection style instructions.",
  },
  {
    code: "SECRET_PATTERN",
    severity: "high",
    pattern: /\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    note: "Contains a likely hard-coded secret.",
  },
  {
    code: "OBFUSCATED_ARCHIVE",
    severity: "critical",
    pattern: /unzip\s+-P|password[- ]protected\s+(?:zip|archive)|7z\s+x\s+-p/i,
    note: "References a password-protected archive.",
  },
  {
    code: "DESTRUCTIVE_COMMAND",
    severity: "critical",
    pattern: /rm\s+-rf\s+\/(?:\s|$)|mkfs\.|diskutil\s+erase|del\s+\/[fsq]\s/i,
    note: "Contains a destructive filesystem command.",
  },
  {
    code: "MEMORY_WRITE",
    severity: "high",
    pattern: /(?:write|update|edit|create|append|modify)[^\n]{0,80}(?:MEMORY\.md|SOUL\.md|\.claude\/settings|opencode\.json)|(?:MEMORY\.md|SOUL\.md|\.claude\/settings|opencode\.json)[^\n]{0,80}(?:write|update|edit|create|append|modify)/i,
    note: "Writes agent memory or configuration.",
  },
  {
    code: "DEPENDENCY_INSTALL",
    severity: "high",
    pattern: /\b(?:npm|pnpm|yarn|pip|pip3|brew|apt-get|choco)\s+(?:install|add)\b/i,
    note: "Installs dependencies that may run lifecycle scripts.",
  },
  {
    code: "EXTERNAL_INSTRUCTION_FETCH",
    severity: "critical",
    pattern: /(?:curl|wget|fetch)[^\n]{0,240}(?:instructions|prompt|system|rules)\.(?:md|txt|json)/i,
    note: "Fetches remote instruction content at runtime.",
  },
];

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp3",
  ".mp4",
  ".mov",
  ".wav",
  ".webm",
  ".so",
  ".dll",
  ".dylib",
  ".exe",
  ".bin",
  ".wasm",
]);

const ARCHIVE_EXTENSIONS = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".bz2",
  ".xz",
  ".7z",
  ".rar",
  ".jar",
  ".whl",
]);

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".sh",
  ".bash",
  ".zsh",
  ".py",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".ps1",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".h",
  ".cpp",
  ".sql",
  ".html",
  ".css",
  ".env",
  ".ini",
  ".conf",
]);

export type FileKind =
  | "skill"
  | "script"
  | "reference"
  | "asset"
  | "binary"
  | "archive"
  | "symlink"
  | "other";

export function classifyFile(filePath: string): FileKind {
  const base = path.basename(filePath).toLowerCase();
  const lower = filePath.toLowerCase();
  const ext = path.extname(base);

  if (base === "skill.md") return "skill";
  if (ARCHIVE_EXTENSIONS.has(ext)) return "archive";
  if (BINARY_EXTENSIONS.has(ext)) return "asset";
  if (lower.includes("/scripts/") || /\.(?:sh|bash|zsh|py|js|mjs|cjs|ts|tsx|ps1|rb|go|rs|java|php|pl|lua|sql)$/.test(lower)) {
    return "script";
  }
  if (lower.includes("/references/") || TEXT_EXTENSIONS.has(ext)) return "reference";
  if (lower.includes("/assets/")) return "asset";
  return "other";
}

export function isLikelyText(filePath: string, buffer: Buffer): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (ARCHIVE_EXTENSIONS.has(ext) || BINARY_EXTENSIONS.has(ext)) return false;
  if (TEXT_EXTENSIONS.has(ext)) return true;
  return !buffer.subarray(0, 8000).includes(0);
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function escapeControlChars(value: string): string {
  return value.replace(
    /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g,
    (char) => `[U+${char.codePointAt(0)?.toString(16).toUpperCase()}]`,
  );
}

function excerptFor(text: string, index: number, length: number, code: string): string {
  const match = text.slice(index, index + length);
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + length + 80);
  let value = `${text.slice(start, index)}${match}${text.slice(index + length, end)}`;
  if (code === "SECRET_PATTERN") value = value.replace(match, "[REDACTED]");
  return escapeControlChars(value.replace(/\s+/g, " ").trim()).slice(0, 180);
}

export interface ScannableFile {
  path: string;
  content: Buffer;
  size: number;
}

export interface ScanInput {
  files: ScannableFile[];
  scriptFiles: string[];
  filesSkipped: number;
  limitations: string[];
  commit: string;
  bundleHash: string;
  scannedAt: string;
}

export function scanSkill(input: ScanInput): ScanResult {
  const evidenceByCode = new Map<string, RiskFlag>();
  let filesScanned = 0;
  let bytesScanned = 0;

  for (const file of input.files) {
    if (file.size > MAX_SCAN_FILE_BYTES) {
      input.limitations.push(`${file.path}: larger than ${MAX_SCAN_FILE_BYTES} bytes; not scanned`);
      input.filesSkipped += 1;
      continue;
    }
    if (bytesScanned + file.size > MAX_SCAN_TOTAL_BYTES) {
      input.limitations.push(`${file.path}: scan budget exceeded; not scanned`);
      input.filesSkipped += 1;
      continue;
    }

    const text = file.content.toString("utf8");
    filesScanned += 1;
    bytesScanned += file.size;

    for (const rule of RULES) {
      const match = rule.pattern.exec(text);
      if (!match || match.index === undefined) continue;
      const context = text.slice(
        Math.max(0, match.index - 160),
        Math.min(text.length, match.index + match[0].length + 120),
      );
      const negated =
        /\b(?:never|do\s+not|don't|avoid|not)\s+(?:run|execute|use|copy|paste)\b/i.test(context);
      const severity =
        negated && rule.severity === "critical" ? "info" : rule.severity;
      const note = negated
        ? `${rule.note} Possible negated/teaching context; verify manually.`
        : rule.note;
      const existing = evidenceByCode.get(rule.code);
      const evidence = {
        file: file.path,
        line: lineOf(text, match.index),
        excerpt: excerptFor(text, match.index, match[0].length, rule.code),
      };
      if (existing) {
        if (existing.evidence.length < 6) existing.evidence.push(evidence);
      } else {
        evidenceByCode.set(rule.code, {
          code: rule.code,
          severity,
          evidence: [evidence],
          note,
        });
      }
    }
  }

  if (input.scriptFiles.length > 0) {
    evidenceByCode.set("SCRIPT_PRESENT", {
      code: "SCRIPT_PRESENT",
      severity: "low",
      evidence: input.scriptFiles.slice(0, 6).map((file) => ({
        file,
        excerpt: "Executable or script file present in the skill bundle.",
      })),
      note: "The bundle contains executable/script files; contents were scanned but never executed.",
    });
  }

  const flags = [...evidenceByCode.values()].sort((a, b) => {
    const order: Record<RiskFlag["severity"], number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      warn: 4,
      info: 5,
    };
    return order[a.severity] - order[b.severity] || a.code.localeCompare(b.code);
  });

  const partial = input.filesSkipped > 0 || input.limitations.length > 0;
  return {
    status: partial ? "partial" : "complete",
    coverage: {
      filesScanned,
      filesSkipped: input.filesSkipped,
      bytesScanned,
      limitations: [...new Set(input.limitations)].slice(0, 20),
    },
    flags,
    scannerVersion: SCANNER_VERSION,
    rulesetVersion: RULESET_VERSION,
    scannedAt: input.scannedAt,
    scannedCommit: input.commit,
    scannedBundleHash: input.bundleHash,
  };
}
