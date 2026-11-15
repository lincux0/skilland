import { useEffect, useMemo, useState } from "react";
import { agents, scenes, shelves } from "../lib/content";
import { scanLabel, statusLabel } from "../lib/format";
import { normalizeSearchTerm } from "../lib/search";
import {
  loadPagefind,
  parseList,
  type PagefindModule,
  type PagefindResultData,
} from "../lib/pagefind";

export interface SearchItem {
  url: string;
  title: string;
  repo: string;
  description: string;
  excerpt?: string;
  license: string;
  scan: string;
  status: string;
  agents: string[];
  risks: string[];
  scenes: string[];
  shelves: string[];
  flags: number;
  rank: number;
}

type FilterKey = "agent" | "scan" | "risk" | "license" | "scene" | "shelf";
type Filters = Partial<Record<FilterKey, string>>;
type FacetCounts = Record<string, Record<string, number>>;

interface Props {
  initialItems: SearchItem[];
}

const FILTER_KEYS: FilterKey[] = ["agent", "scan", "risk", "license", "scene", "shelf"];
const RISK_ORDER = ["critical", "high", "medium", "low", "info", "none"];
const RISK_LABELS: Record<string, string> = {
  critical: "严重",
  high: "高",
  medium: "中",
  low: "低",
  info: "提示",
  none: "未命中",
};

function agentShort(id: string): string {
  return agents.find((agent) => agent.id === id)?.short ?? id.slice(0, 2).toUpperCase();
}

function agentLabel(id: string): string {
  return agents.find((agent) => agent.id === id)?.label ?? id;
}

function sceneLabel(id: string): string {
  return scenes.find((scene) => scene.id === id)?.title ?? id;
}

function shelfLabel(id: string): string {
  return shelves.find((shelf) => shelf.id === id)?.title ?? id;
}

function filterValueLabel(key: FilterKey, value: string): string {
  if (key === "agent") return agentLabel(value);
  if (key === "scan") return scanLabel(value);
  if (key === "risk") return RISK_LABELS[value] ?? value;
  if (key === "scene") return sceneLabel(value);
  if (key === "shelf") return shelfLabel(value);
  return value;
}

function hasPositiveCounts(counts: FacetCounts | undefined): boolean {
  return Boolean(
    counts &&
      Object.values(counts).some((group) =>
        Object.values(group).some((value) => value > 0),
      ),
  );
}

function countFacets(items: SearchItem[]): FacetCounts {
  const counts: FacetCounts = {};
  const add = (key: string, value: string) => {
    counts[key] ??= {};
    counts[key]![value] = (counts[key]![value] ?? 0) + 1;
  };
  for (const item of items) {
    item.agents.forEach((agent) => add("agent", agent));
    add("scan", item.scan);
    (item.risks.length ? item.risks : ["none"]).forEach((risk) => add("risk", risk));
    add("license", item.license);
    item.scenes.forEach((scene) => add("scene", scene));
    item.shelves.forEach((shelf) => add("shelf", shelf));
  }
  return counts;
}

function filterInitial(items: SearchItem[], query: string, filters: Filters): SearchItem[] {
  const q = normalizeSearchTerm(query).toLowerCase();
  return items.filter((item) => {
    if (q) {
      const text = `${item.title} ${item.repo} ${item.description} ${item.scenes.join(" ")} ${item.shelves.join(" ")}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    if (filters.agent && !item.agents.includes(filters.agent)) return false;
    if (filters.scan && item.scan !== filters.scan) return false;
    if (filters.risk && !(item.risks.length ? item.risks : ["none"]).includes(filters.risk)) return false;
    if (filters.license && item.license !== filters.license) return false;
    if (filters.scene && !item.scenes.includes(filters.scene)) return false;
    if (filters.shelf && !item.shelves.includes(filters.shelf)) return false;
    return true;
  });
}

function itemFromPagefind(data: PagefindResultData): SearchItem {
  const meta = data.meta ?? {};
  const filters = data.filters ?? {};
  return {
    url: data.url,
    title: meta.title ?? "Untitled",
    repo: meta.repo ?? "",
    description: meta.description ?? data.plain_excerpt ?? "",
    excerpt: data.excerpt,
    license: filters.license?.[0] ?? meta.license ?? "未声明",
    scan: filters.scan?.[0] ?? meta.scan ?? "unknown",
    status: meta.status ?? "draft",
    agents: filters.agent ?? parseList(meta.agents),
    risks: filters.risk ?? parseList(meta.risk),
    scenes: filters.scene ?? [],
    shelves: filters.shelf ?? [],
    flags: Number(meta.flags ?? 0),
    rank: Number(meta.rank ?? 9999),
  };
}

function resultHref(item: SearchItem, query: string): string {
  const term = query.trim();
  if (!term) return item.url;
  const [base, hash] = item.url.split("#");
  const separator = base!.includes("?") ? "&" : "?";
  return `${base}${separator}q=${encodeURIComponent(term)}${hash ? `#${hash}` : ""}`;
}

function ResultCard({ item, query }: { item: SearchItem; query: string }) {
  return (
    <a
      href={resultHref(item, query)}
      className="group card flex min-w-0 flex-col p-4 transition-colors hover:border-accent/50 hover:bg-surface-2/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight group-hover:text-accent">
            {item.title}
          </h3>
          <p className="mt-1 font-mono text-[10px] text-faint">{item.repo}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.agents.slice(0, 4).map((agent) => (
            <span
              key={agent}
              title={agentLabel(agent)}
              className="grid h-5 min-w-5 place-items-center rounded-[5px] border border-line bg-surface-2 px-1 font-mono text-[9px] text-muted"
            >
              {agentShort(agent)}
            </span>
          ))}
        </div>
      </div>

      {query.trim() && item.excerpt ? (
        <p
          className="mt-3 line-clamp-3 text-[13px] leading-6 text-muted [&_mark]:rounded-[2px] [&_mark]:bg-accent/25 [&_mark]:px-0.5 [&_mark]:text-ink"
          dangerouslySetInnerHTML={{ __html: item.excerpt }}
        />
      ) : (
        <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-muted">{item.description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        <span className="chip">{item.license}</span>
        <span className="chip">{scanLabel(item.scan)}</span>
        {item.flags > 0 && <span className="chip">{item.flags} 项命中</span>}
        <span className="chip chip-accent">{statusLabel(item.status)}</span>
      </div>
    </a>
  );
}

export default function SearchExplorer({ initialItems }: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [urlReady, setUrlReady] = useState(false);
  const [pagefind, setPagefind] = useState<PagefindModule | null>(null);
  const [engine, setEngine] = useState<"loading" | "pagefind" | "fallback">("loading");
  const [items, setItems] = useState<SearchItem[]>(initialItems);
  const [total, setTotal] = useState(initialItems.length);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [facetCounts, setFacetCounts] = useState<FacetCounts>(() => countFacets(initialItems));

  const initialFacetCounts = useMemo(() => countFacets(initialItems), [initialItems]);
  const activeFilterCount = Object.keys(filters).length;
  const normalizedQuery = normalizeSearchTerm(query);
  const queryWasNormalized = Boolean(normalizedQuery) && normalizedQuery !== query.trim();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    const next: Filters = {};
    for (const key of FILTER_KEYS) {
      const value = params.get(key);
      if (value) next[key] = value;
    }
    setFilters(next);
    setUrlReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadPagefind().then((instance) => {
      if (cancelled) return;
      if (!instance) {
        setEngine("fallback");
        return;
      }
      setPagefind(instance);
      setEngine("pagefind");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pagefind) return;
    let cancelled = false;
    pagefind
      .filters()
      .then((counts) => {
        if (!cancelled) setFacetCounts(counts);
      })
      .catch(() => {
        // Search still works without facet counts.
      });
    return () => {
      cancelled = true;
    };
  }, [pagefind]);

  useEffect(() => {
    if (!urlReady) return;

    if (!pagefind) {
      const filtered = filterInitial(initialItems, query, filters);
      setItems(filtered);
      setTotal(filtered.length);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const term = normalizeSearchTerm(query) || null;
        const search = await pagefind.search(term, {
          filters: { ...filters, type: "skill" },
        });
        const data = await Promise.all(search.results.map((result) => result.data()));
        if (cancelled) return;
        const nextItems = data.map(itemFromPagefind);
        if (term === null) nextItems.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
        setItems(nextItems);
        setTotal(search.results.length);
        const counts = hasPositiveCounts(search.filters)
          ? search.filters!
          : hasPositiveCounts(search.totalFilters)
            ? search.totalFilters!
            : await pagefind.filters();
        if (!cancelled) setFacetCounts(counts);
      } catch {
        if (!cancelled) {
          setEngine("fallback");
          setFacetCounts(initialFacetCounts);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [urlReady, pagefind, query, filters, initialItems, initialFacetCounts]);

  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");
    for (const key of FILTER_KEYS) {
      if (filters[key]) url.searchParams.set(key, filters[key]!);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
  }, [query, filters, urlReady]);

  function toggleFilter(key: FilterKey, value: string) {
    setFilters((previous) => {
      const next = { ...previous };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function clearAll() {
    setFilters({});
    setQuery("");
  }

  const licenseValues = useMemo(() => {
    const counts = facetCounts.license ?? initialFacetCounts.license ?? {};
    const values = Object.keys(counts).sort(
      (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b),
    );
    if (filters.license && !values.includes(filters.license)) values.unshift(filters.license);
    return values;
  }, [facetCounts, initialFacetCounts, filters.license]);

  const riskValues = useMemo(
    () =>
      RISK_ORDER.filter(
        (risk) => (facetCounts.risk?.[risk] ?? 0) > 0 || filters.risk === risk,
      ),
    [facetCounts, filters.risk],
  );

  const scanValues = useMemo(
    () =>
      ["complete", "partial", "failed"].filter(
        (scan) => (facetCounts.scan?.[scan] ?? 0) > 0 || filters.scan === scan,
      ),
    [facetCounts, filters.scan],
  );

  const groups = [
    {
      key: "agent" as const,
      label: "客户端",
      values: agents.map((agent) => ({
        value: agent.id,
        label: agent.label,
        count: facetCounts.agent?.[agent.id] ?? 0,
      })),
    },
    {
      key: "scan" as const,
      label: "扫描",
      values: scanValues.map((value) => ({
        value,
        label: scanLabel(value),
        count: facetCounts.scan?.[value] ?? 0,
      })),
    },
    {
      key: "risk" as const,
      label: "风险",
      values: riskValues.map((value) => ({
        value,
        label: RISK_LABELS[value] ?? value,
        count: facetCounts.risk?.[value] ?? 0,
      })),
    },
    {
      key: "license" as const,
      label: "许可证",
      values: licenseValues.map((value) => ({
        value,
        label: value,
        count: facetCounts.license?.[value] ?? 0,
      })),
    },
    {
      key: "scene" as const,
      label: "场景",
      values: scenes
        .map((scene) => ({
          value: scene.id,
          label: scene.title,
          count: facetCounts.scene?.[scene.id] ?? 0,
        }))
        .filter((item) => item.count > 0 || filters.scene === item.value),
    },
    {
      key: "shelf" as const,
      label: "专题",
      values: shelves
        .map((shelf) => ({
          value: shelf.id,
          label: shelf.title,
          count: facetCounts.shelf?.[shelf.id] ?? 0,
        }))
        .filter((item) => item.count > 0 || filters.shelf === item.value),
    },
  ];

  return (
    <div className="container-page py-12 md:py-16">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-accent">
          {engine === "pagefind" ? "Pagefind 全文搜索" : "Phase 3 · 搜索"}
        </span>
        <span className="chip">
          {engine === "fallback" ? "索引不可用 · 元数据回退" : "中文分词 · 分面过滤"}
        </span>
      </div>

      <h1 className="mt-6 text-[34px] font-semibold tracking-[-0.03em] md:text-[44px]">
        全部 Skills
      </h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted">
        搜名称、描述、用法、文件与风险证据。当前索引只包含详情页；扫描结果不是安全认证。
      </p>

      <div className="mt-7 flex max-w-3xl flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="explore-search">
          搜索 Skills
        </label>
        <input
          id="explore-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            pagefind?.preload?.(normalizeSearchTerm(event.target.value), {
              filters: { ...filters, type: "skill" },
            });
          }}
          placeholder="搜 skill、场景、文件或风险，例如“测试”“设计稿”"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setQuery("")}
          className="h-11 rounded-lg border border-line-strong px-4 text-[12px] text-muted transition-colors hover:border-accent hover:text-accent"
        >
          清空
        </button>
      </div>

      {engine === "fallback" && (
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-[11px] leading-5 text-muted">
          当前没有可用的 Pagefind 索引（开发模式常见）。运行 <code className="mono">npm run build</code> 后
          用 <code className="mono">npm run preview</code> 体验全文搜索；这里暂时退回元数据过滤。
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-[12px] lg:hidden"
            aria-expanded={filtersOpen}
          >
            <span>筛选{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}</span>
            <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span>
          </button>

          <aside className={`${filtersOpen ? "block" : "hidden"} space-y-3 lg:block lg:sticky lg:top-20`}>
            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                  Filters
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters({})}
                    className="text-[10px] text-accent hover:underline"
                  >
                    清除
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted">
                每个分组单选；再次点击取消。筛选状态写入 URL。
              </p>
            </div>

            {groups.map((group) =>
              group.values.length === 0 ? null : (
                <div className="card p-4" key={group.key}>
                  <p className="text-[11px] font-medium text-ink">{group.label}</p>
                  <div className="mt-2 space-y-0.5">
                    {group.values.map((item) => {
                      const selected = filters[group.key] === item.value;
                      return (
                        <button
                          type="button"
                          key={item.value}
                          onClick={() => toggleFilter(group.key, item.value)}
                          aria-pressed={selected}
                          className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[11px] transition-colors ${
                            selected
                              ? "bg-accent/15 text-accent"
                              : "text-muted hover:bg-surface-2 hover:text-ink"
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          <span className="font-mono text-[9px] text-faint">{item.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </aside>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              <span aria-live="polite">{total}</span> results
              {loading ? " · searching" : ""}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {query.trim() && <span className="chip">q: {query.trim()}</span>}
              {queryWasNormalized && <span className="chip">按 “{normalizedQuery}” 搜索</span>}
              {FILTER_KEYS.map((key) =>
                filters[key] ? (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleFilter(key, filters[key]!)}
                    className="chip chip-accent"
                  >
                    {filterValueLabel(key, filters[key]!)} ×
                  </button>
                ) : null,
              )}
              {(query.trim() || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] text-muted hover:text-accent"
                >
                  清除全部
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="card mt-4 p-10 text-center">
              <p className="text-[15px] font-medium">没找到。</p>
              <p className="mt-2 text-[13px] text-muted">试试“补测试”“设计稿”或清除筛选。</p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-5 text-[12px] text-accent link-underline"
              >
                清除全部筛选
              </button>
            </div>
          ) : (
            <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
              {items.map((item) => (
                <ResultCard item={item} query={normalizedQuery || query} key={item.url} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
