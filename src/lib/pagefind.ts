export interface PagefindResultData {
  url: string;
  excerpt: string;
  plain_excerpt?: string;
  meta?: Record<string, string>;
  filters?: Record<string, string[]>;
}

export interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

export interface PagefindSearch {
  results: PagefindResult[];
  unfilteredResultCount?: number;
  filters?: Record<string, Record<string, number>>;
  totalFilters?: Record<string, Record<string, number>>;
}

export interface PagefindModule {
  init: () => Promise<void>;
  search: (
    term: string | null,
    options?: { filters?: Record<string, unknown> },
  ) => Promise<PagefindSearch>;
  filters: () => Promise<Record<string, Record<string, number>>>;
  preload?: (term: string, options?: { filters?: Record<string, unknown> }) => void;
}

let pagefindPromise: Promise<PagefindModule | null> | undefined;

export function loadPagefind(): Promise<PagefindModule | null> {
  if (!pagefindPromise) {
    // The bundle only exists after `npm run build` (Pagefind runs post-build),
    // so keep this import runtime-only and out of Vite/TypeScript resolution.
    const bundle = "/pagefind/pagefind.js";
    pagefindPromise = import(/* @vite-ignore */ bundle)
      .then(async (module) => {
        const pagefind = module as PagefindModule;
        await pagefind.init();
        return pagefind;
      })
      .catch(() => null);
  }
  return pagefindPromise;
}

export function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
