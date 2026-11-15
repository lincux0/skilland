import fs from "node:fs";
import path from "node:path";
import { getAllSkills } from "../../src/lib/skills";
import {
  sourceHash,
  type TranslationEntry,
  type TranslationFile,
} from "../../src/lib/translations";

const TRANSLATIONS_FILE = path.join(process.cwd(), "data", "translations.json");
const MAX_CHUNK = 360;

export interface BackfillOptions {
  limit?: number;
  dryRun?: boolean;
  force?: boolean;
  provider?: "auto" | "google" | "mymemory";
  log?: (message: string) => void;
}

export interface BackfillStats {
  total: number;
  pending: number;
  translated: number;
  upgraded: number;
  failed: number;
  skipped: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function loadTranslationFile(): TranslationFile {
  if (!fs.existsSync(TRANSLATIONS_FILE)) return {};
  return JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, "utf8")) as TranslationFile;
}

export function saveTranslationFile(file: TranslationFile) {
  const sorted = Object.fromEntries(
    Object.entries(file).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(TRANSLATIONS_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

/** Split long descriptions so translation endpoints stay under their limits. */
export function chunkText(text: string, size = MAX_CHUNK): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return [clean];

  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let current = "";

  const push = (value: string) => {
    if (value.trim()) chunks.push(value.trim());
  };

  for (const sentence of sentences) {
    if (sentence.length > size) {
      push(current);
      current = "";
      for (const word of sentence.split(" ")) {
        if ((current + " " + word).trim().length > size) {
          push(current);
          current = word;
        } else {
          current = current ? `${current} ${word}` : word;
        }
      }
      continue;
    }
    if ((current + sentence).length > size) {
      push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  push(current);
  return chunks.length > 0 ? chunks : [clean];
}

async function llmChunk(text: string): Promise<string | null> {
  const url = process.env.TRANSLATE_LLM_URL;
  const key = process.env.TRANSLATE_LLM_KEY;
  if (!url || !key) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.TRANSLATE_LLM_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Translate the user's text into concise, natural Simplified Chinese. " +
            "Keep product names, commands and file paths unchanged. Output only the translation.",
        },
        { role: "user", content: text },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const out = data.choices?.[0]?.message?.content?.trim();
  return out || null;
}

async function googleChunk(text: string): Promise<string | null> {
  const url =
    "https://translate.googleapis.com/translate_a/single" +
    `?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return null;
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const out = (data[0] as unknown[])
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
    .join("")
    .trim();
  return out || null;
}

async function myMemoryChunk(text: string): Promise<string | null> {
  const url =
    "https://api.mymemory.translated.net/get" +
    `?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent("en|zh-CN")}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    responseStatus?: number | string;
    responseData?: { translatedText?: string };
  };
  const out = data.responseData?.translatedText?.trim();
  if (!out || out.includes("MYMEMORY WARNING")) return null;
  return out;
}

async function translateChunks(
  text: string,
  provider: "auto" | "google" | "mymemory",
): Promise<{ zh: string; provider: string } | null> {
  const chunks = chunkText(text);
  const out: string[] = [];
  let used = provider === "auto" ? "llm" : provider;

  for (const chunk of chunks) {
    const attempts: ("llm" | "google" | "mymemory")[] =
      provider === "auto" ? ["llm", "google", "mymemory"] : [provider];

    let translated: string | null = null;
    for (const attempt of attempts) {
      try {
        if (attempt === "llm") translated = await llmChunk(chunk);
        else if (attempt === "google") translated = await googleChunk(chunk);
        else translated = await myMemoryChunk(chunk);
      } catch {
        translated = null;
      }
      if (translated) {
        used = attempt;
        break;
      }
    }
    if (!translated) return null;
    out.push(translated);
    await sleep(250);
  }

  return { zh: out.join(""), provider: used };
}

/**
 * Fill in Chinese descriptions for skills that lack one. Existing manual
 * strings are upgraded in place and never overwritten unless --force.
 */
export async function backfillTranslations(
  options: BackfillOptions = {},
): Promise<BackfillStats> {
  const { limit = Number.POSITIVE_INFINITY, dryRun = false, force = false, provider = "auto" } = options;
  const log = options.log ?? (() => {});

  const file = loadTranslationFile();
  const skills = getAllSkills();
  const stats: BackfillStats = {
    total: skills.length,
    pending: 0,
    translated: 0,
    upgraded: 0,
    failed: 0,
    skipped: 0,
  };
  let changed = false;
  let calls = 0;

  for (const skill of skills) {
    const description = skill.description.trim();
    if (!description) {
      stats.skipped++;
      continue;
    }
    const hash = sourceHash(description);
    const existing = file[skill.publicId];

    if (typeof existing === "string") {
      file[skill.publicId] = {
        zh: existing,
        source: hash,
        provider: "manual",
        at: new Date().toISOString(),
      } satisfies TranslationEntry;
      stats.upgraded++;
      changed = true;
      continue;
    }

    // Already curated inside data/repos/*.json — record it so it survives
    // future syncs and is not sent to a translation service.
    if (!existing && skill.descriptionZh) {
      file[skill.publicId] = {
        zh: skill.descriptionZh,
        source: hash,
        provider: "manual",
        at: new Date().toISOString(),
      };
      stats.upgraded++;
      changed = true;
      continue;
    }

    if (existing && existing.source === hash && !force) continue;

    stats.pending++;
    if (calls >= limit) {
      stats.skipped++;
      continue;
    }

    if (dryRun) {
      log(`would translate: ${skill.publicId}`);
      continue;
    }

    calls++;
    const result = await translateChunks(description, provider);
    if (!result) {
      stats.failed++;
      log(`translate failed: ${skill.publicId}`);
      continue;
    }

    file[skill.publicId] = {
      zh: result.zh,
      source: hash,
      provider: result.provider,
      at: new Date().toISOString(),
    };
    stats.translated++;
    changed = true;
    log(`translated: ${skill.publicId} (${result.provider})`);
  }

  if (changed && !dryRun) saveTranslationFile(file);
  return stats;
}

export function describeStats(stats: BackfillStats): string {
  return (
    `skills=${stats.total} translated=${stats.translated} failed=${stats.failed} ` +
    `upgraded=${stats.upgraded} pending=${stats.pending} skipped=${stats.skipped}`
  );
}
