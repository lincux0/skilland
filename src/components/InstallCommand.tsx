import { useState } from "react";

interface Props {
  latestCommand: string;
  useCommand: string;
  reviewedCommand?: string;
  reviewedCommit?: string;
}

export default function InstallCommand({
  latestCommand,
  useCommand,
  reviewedCommand,
  reviewedCommit,
}: Props) {
  const [tab, setTab] = useState<"reviewed" | "latest">(
    reviewedCommand ? "reviewed" : "latest",
  );
  const [copied, setCopied] = useState<"install" | "use" | null>(null);

  const command =
    tab === "reviewed" && reviewedCommand ? reviewedCommand : latestCommand;

  async function copy(value: string, kind: "install" | "use") {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-1 rounded-md bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => reviewedCommand && setTab("reviewed")}
            className={`rounded px-2.5 py-1.5 text-[11px] transition-colors ${
              tab === "reviewed"
                ? "bg-canvas text-ink"
                : "text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            }`}
            disabled={!reviewedCommand}
            title={reviewedCommand ? undefined : "当前没有已复核版本"}
          >
            已复核版本
          </button>
          <button
            type="button"
            onClick={() => setTab("latest")}
            className={`rounded px-2.5 py-1.5 text-[11px] transition-colors ${
              tab === "latest" ? "bg-canvas text-ink" : "text-muted hover:text-ink"
            }`}
          >
            最新同步版本
          </button>
        </div>
        <span className="font-mono text-[10px] text-faint">
          {tab === "reviewed" && reviewedCommit
            ? `@${reviewedCommit.slice(0, 8)}`
            : "未复核"}
        </span>
      </div>

      <div className="p-4">
        <p className="text-[11px] leading-5 text-muted">
          {tab === "reviewed"
            ? "固定到最近一次人工复核的 commit。"
            : "固定到仓库当前 HEAD；Phase 1 样例没有人工复核版本。"}
        </p>
        <pre className="mono mt-3 overflow-x-auto rounded-md border border-line bg-canvas px-3 py-3 text-[11px] leading-5 text-ink">
          <code>{command}</code>
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(command, "install")}
            className="rounded-md bg-accent px-3 py-2 text-[11px] font-semibold text-accent-ink transition-opacity hover:opacity-90"
          >
            {copied === "install" ? "已复制" : "复制安装命令"}
          </button>
          <button
            type="button"
            onClick={() => copy(useCommand, "use")}
            className="rounded-md border border-line-strong px-3 py-2 text-[11px] text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {copied === "use" ? "已复制" : "复制临时使用命令"}
          </button>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-faint">
          临时使用（无需安装）不是沙箱：agent 仍以正常权限运行，可能读写文件、联网或执行命令。
        </p>
      </div>
    </div>
  );
}
