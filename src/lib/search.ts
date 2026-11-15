const ALIASES: Record<string, string> = {
  desgin: "design",
  recat: "react",
  tset: "test",
  tets: "test",
  javscript: "javascript",
  typscript: "typescript",
  deply: "deploy",
  depoly: "deploy",
  单测: "测试",
  单元测试: "测试",
  部署上线: "部署",
};

/**
 * Small, transparent query normalization layer.
 * Pagefind handles CJK segmentation but intentionally does not do fuzzy typo
 * correction; this map covers the handful of queries we see repeatedly.
 */
export function normalizeSearchTerm(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return ALIASES[trimmed.toLowerCase()] ?? trimmed;
}
