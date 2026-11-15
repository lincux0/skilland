import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { loadPagefind, type PagefindModule } from "../lib/pagefind";
import { normalizeSearchTerm } from "../lib/search";

interface Item {
  url: string;
  title: string;
  repo: string;
  excerpt: string;
}

function hrefFor(item: Item, query: string): string {
  if (!query.trim()) return item.url;
  const [base, hash] = item.url.split("#");
  const separator = base!.includes("?") ? "&" : "?";
  return `${base}${separator}q=${encodeURIComponent(query.trim())}${hash ? `#${hash}` : ""}`;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [pagefind, setPagefind] = useState<PagefindModule | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open || pagefind) return;
    let cancelled = false;
    loadPagefind().then((instance) => {
      if (cancelled) return;
      if (instance) setPagefind(instance);
      else setUnavailable(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, pagefind]);

  useEffect(() => {
    if (!open || !pagefind) return;
    const term = normalizeSearchTerm(query);
    if (!term) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const search = await pagefind.search(term, { filters: { type: "skill" } });
        const data = await Promise.all(search.results.slice(0, 8).map((result) => result.data()));
        if (cancelled) return;
        setItems(
          data.map((entry) => ({
            url: entry.url,
            title: entry.meta?.title ?? "Untitled",
            repo: entry.meta?.repo ?? "",
            excerpt: entry.plain_excerpt ?? "",
          })),
        );
        setTotal(search.results.length);
        setActive(0);
      } catch {
        if (!cancelled) setUnavailable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, pagefind, query]);

  const resultCount = useMemo(() => (query.trim() ? total : 0), [total, query]);

  function close() {
    setOpen(false);
    setQuery("");
    setItems([]);
    setTotal(0);
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && items[active]) {
      event.preventDefault();
      window.location.href = hrefFor(items[active], normalizeSearchTerm(query));
      close();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-md border border-line-strong px-3 text-[12px] text-muted transition-colors hover:border-accent hover:text-accent"
        aria-label="打开搜索"
      >
        <span>搜索</span>
        <kbd className="hidden rounded border border-line px-1 font-mono text-[9px] text-faint sm:inline">⌘K</kbd>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="搜索 Skills"
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="font-mono text-[10px] text-faint">⌘K</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="搜索 skill、场景、文件或风险..."
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
                aria-label="搜索 Skills"
              />
              <button type="button" onClick={close} className="text-[11px] text-faint hover:text-ink">
                Esc
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {unavailable ? (
                <p className="px-3 py-8 text-center text-[12px] text-muted">
                  搜索索引不可用。运行 <code className="mono">npm run build</code> 后使用{" "}
                  <code className="mono">npm run preview</code>。
                </p>
              ) : !query.trim() ? (
                <p className="px-3 py-8 text-center text-[12px] text-muted">
                  输入关键词搜索。
                </p>
              ) : loading ? (
                <p className="px-3 py-8 text-center text-[12px] text-muted">搜索中…</p>
              ) : items.length === 0 ? (
                <p className="px-3 py-8 text-center text-[12px] text-muted">没有匹配结果。</p>
              ) : (
                <>
                  <p className="px-3 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-faint" aria-live="polite">
                    {resultCount} 条
                  </p>
                  {items.map((item, index) => (
                    <a
                      key={item.url}
                      href={hrefFor(item, normalizeSearchTerm(query))}
                      onClick={close}
                      onMouseEnter={() => setActive(index)}
                      className={`block rounded-lg px-3 py-2.5 transition-colors ${
                        index === active ? "bg-surface-2" : "hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13px] font-medium text-ink">{item.title}</span>
                        <span className="shrink-0 font-mono text-[9px] text-faint">{item.repo}</span>
                      </div>
                      {item.excerpt && (
                        <p className="mt-1 line-clamp-1 text-[11px] text-muted">{item.excerpt}</p>
                      )}
                    </a>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
