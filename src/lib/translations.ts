import { createHash } from "node:crypto";

export interface TranslationEntry {
  zh: string;
  /** sha256 prefix of the English description this translation was made from. */
  source: string;
  provider: string;
  at: string;
}

export type TranslationFile = Record<string, TranslationEntry | string>;

export function sourceHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

/**
 * A translation is used only while it still matches the current English
 * description; upstream edits invalidate it and trigger a re-translation.
 */
export function pickTranslation(
  file: TranslationFile,
  publicId: string,
  description: string,
): string | undefined {
  const entry = file[publicId];
  if (!entry) return undefined;
  if (typeof entry === "string") return entry;
  return entry.source === sourceHash(description) ? entry.zh : undefined;
}
