export function shortCommit(commit: string): string {
  return commit.slice(0, 8);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `~${(tokens / 1000).toFixed(1)}k`;
  return `~${tokens}`;
}

export function licenseLabel(spdx: string | null): string {
  return spdx ?? "未声明";
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "草稿",
    published: "已发布",
    quarantined: "已隔离",
    archived: "已归档",
    removed: "已下架",
  };
  return labels[status] ?? status;
}

export function scanLabel(status: string): string {
  const labels: Record<string, string> = {
    complete: "已完整扫描",
    partial: "部分扫描",
    failed: "扫描失败",
    "not-scanned": "未扫描",
  };
  return labels[status] ?? status;
}

export function reviewLabel(status: string): string {
  const labels: Record<string, string> = {
    unreviewed: "未复核",
    "machine-scanned": "仅机器扫描",
    "human-approved": "已人工复核",
    "human-rejected": "复核未通过",
    stale: "复核已失效",
  };
  return labels[status] ?? status;
}
