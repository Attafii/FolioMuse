"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConsentTier, QualityLevel } from "@/domain/curation/types";
import type { SortKey } from "@/lib/gallery-query";

/**
 * Client access to the paginated gallery API (LCP fix).
 *
 * The server executes filtering/sorting/pagination; the client only
 * serializes params and renders one page (~30 KB). A tiny module cache
 * dedupes identical concurrent requests (homepage sections often share
 * params) without keeping the corpus in memory.
 */

export interface GalleryQueryParams {
  q?: string;
  role?: string[];
  style?: string[];
  stack?: string[];
  quality?: QualityLevel[];
  consent?: ConsentTier[];
  source?: string[];
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface GalleryFacet {
  value: string;
  count: number;
}

/** Shape served by /api/gallery/facets (superset used by all filter UIs). */
export interface GalleryFacets {
  roles: GalleryFacet[];
  styles: GalleryFacet[];
  stacks: GalleryFacet[];
  qualities: GalleryFacet[];
  consents: GalleryFacet[];
}

interface PageState {
  items: import("@/domain/curation/types").GalleryItemSummary[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

function serialize(params: GalleryQueryParams): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  for (const r of params.role ?? []) sp.append("role", r);
  for (const s of params.style ?? []) sp.append("style", s);
  for (const s of params.stack ?? []) sp.append("stack", s);
  for (const src of params.source ?? []) sp.append("source", src);
  for (const q2 of params.quality ?? []) sp.append("quality", q2);
  for (const c of params.consent ?? []) sp.append("consent", c);
  if (params.sort && params.sort !== "newest") sp.set("sort", params.sort);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  return sp.toString();
}

const pageCache = new Map<string, PageState>();
const inFlight = new Map<string, Promise<PageState>>();
const listeners = new Map<string, Set<() => void>>();

async function fetchPage(key: string, qs: string): Promise<PageState> {
  const res = await fetch(`/api/gallery/summaries${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as Omit<PageState, "loading" | "error">;
  return { ...data, loading: false, error: null };
}

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

export function useGalleryQuery(params: GalleryQueryParams): PageState & {
  refetch: () => void;
} {
  // Stable serialization regardless of caller-side object identity.
  const qs = serialize(params);
  const key = qs;

  const [state, setState] = useState<PageState>(
    () =>
      pageCache.get(key) ?? {
        items: [],
        total: 0,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 24,
        loading: true,
        error: null,
      },
  );

  const load = useCallback(
    async (force = false): Promise<PageState> => {
      if (!force && pageCache.has(key)) {
        return pageCache.get(key)!;
      }
      const existing = inFlight.get(key);
      if (existing) return existing;

      const p = fetchPage(key, qs)
        .then((fresh) => {
          pageCache.set(key, fresh);
          emit(key);
          return fresh;
        })
        .catch(() => {
          const failed: PageState = {
            items: [],
            total: 0,
            page: 1,
            pageSize: params.pageSize ?? 24,
            loading: false,
            error: "The gallery could not be loaded right now.",
          };
          emit(key);
          return failed;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, p);
      return p;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params are serialized above
    [key, qs],
  );

  useEffect(() => {
    let cancelled = false;
    // Cache hits were already seeded by the lazy useState initializer; the
    // effect only starts/awaits fetches — never setState synchronously.
    void load().then((fresh) => {
      if (!cancelled) setState(fresh);
    });
    const set = listeners.get(key) ?? new Set();
    set.add(() => setState(pageCache.get(key)!));
    listeners.set(key, set);
    return () => {
      cancelled = true;
      listeners.get(key)?.delete(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key fully identifies params
  }, [key]);

  const refetch = useCallback(() => void load(true).then(setState), [load]);

  return { ...state, refetch };
}

// â”€â”€ Facets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let facetsCache: GalleryFacets | null = null;
let facetsInFlight: Promise<GalleryFacets> | null = null;
const facetListeners = new Set<() => void>();

async function fetchFacets(): Promise<GalleryFacets> {
  const res = await fetch("/api/gallery/facets", { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as { facets: GalleryFacets };
  facetsCache = data.facets;
  facetListeners.forEach((fn) => fn());
  return data.facets;
}

export function useGalleryFacets(): {
  facets: GalleryFacets | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [state, setState] = useState<{
    facets: GalleryFacets | null;
    loading: boolean;
    error: string | null;
  }>({ facets: facetsCache, loading: facetsCache === null, error: null });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const listener = () =>
      mounted.current && setState({ facets: facetsCache, loading: false, error: null });
    facetListeners.add(listener);
    if (!facetsCache && !facetsInFlight) {
      facetsInFlight = fetchFacets().finally(() => {
        facetsInFlight = null;
      });
    }
    facetsInFlight
      ?.then(() => listener())
      .catch(() => mounted.current && setState((s) => ({ ...s, loading: false, error: "x" })));
    return () => {
      mounted.current = false;
      facetListeners.delete(listener);
    };
  }, []);

  const refetch = useCallback(() => {
    void fetchFacets();
  }, []);

  return useMemo(
    () => ({
      facets: state.facets,
      loading: state.loading,
      error: state.error ? "The gallery could not be loaded right now." : null,
      refetch,
    }),
    [state.facets, state.loading, state.error, refetch],
  );
}
