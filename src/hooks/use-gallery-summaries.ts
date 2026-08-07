"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { GalleryItemSummary } from "@/domain/curation/types";

interface GallerySummariesResponse {
  items: GalleryItemSummary[];
  count: number;
}

interface GallerySummariesState {
  items: GalleryItemSummary[];
  count: number;
  loading: boolean;
  error: string | null;
}

/**
 * Shared module-level cache for /api/gallery/summaries (plan T9 decision:
 * ONE fetch source — multiple sections on the page subscribe to the same
 * state instead of re-fetching per section).
 *
 * - First hook mount kicks off the fetch; every subsequent mount (SearchHero,
 *   NewNotable, RoleExplorer, SectionExplorer) subscribes via
 *   useSyncExternalStore and receives the SAME state.
 * - refetch() re-runs the fetch and updates all subscribers.
 * - States: loading (skeleton) → error (retry) → data (may be empty).
 *
 * Client-side hook — the homepage filters these summaries in-memory;
 * no server-side search, no debounce libraries, no ranking (zero deps).
 */

let state: GallerySummariesState = {
  items: [],
  count: 0,
  loading: true,
  error: null,
};
let started = false;
const listeners = new Set<() => void>();

function setState(next: GallerySummariesState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot(): GallerySummariesState {
  // SSR/prerender: no fetch, no hydration mismatch — clients always start
  // from the loading state and update after the shared fetch resolves.
  return { items: [], count: 0, loading: true, error: null };
}

async function load() {
  setState({ items: [], count: 0, loading: true, error: null });
  try {
    const res = await fetch("/api/gallery/summaries", {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    const data = (await res.json()) as GallerySummariesResponse;
    const items = data.items ?? [];
    setState({
      items,
      count: data.count ?? items.length,
      loading: false,
      error: null,
    });
  } catch {
    setState({
      items: [],
      count: 0,
      loading: false,
      error: "The gallery could not be loaded right now.",
    });
  }
}

function ensureStarted() {
  if (!started) {
    started = true;
    void load();
  }
}

export function useGallerySummaries(): GallerySummariesState & {
  refetch: () => void;
} {
  const { items, count, loading, error } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    ensureStarted();
  }, []);

  const refetch = useCallback(() => {
    void load();
  }, []);

  return { items, count, loading, error, refetch };
}
