"use client";

import { useCallback, useEffect, useState } from "react";

import type { GalleryItemSummary } from "@/domain/curation/types";

interface GallerySummariesResponse {
  items: GalleryItemSummary[];
  count: number;
}

interface UseGallerySummariesResult {
  items: GalleryItemSummary[];
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches /api/gallery/summaries once on mount (plan T8).
 * Client-side hook — the homepage hero filters these summaries in-memory;
 * no server-side search, no debounce libraries, no ranking (zero deps).
 *
 * States: loading (skeleton) → error (retry) → data (may be empty).
 */
export function useGallerySummaries(): UseGallerySummariesResult {
  const [items, setItems] = useState<GalleryItemSummary[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/gallery/summaries", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const data = (await res.json()) as GallerySummariesResponse;
        if (cancelled) return;
        setItems(data.items ?? []);
        setCount(data.count ?? data.items?.length ?? 0);
      } catch {
        if (cancelled) return;
        setItems([]);
        setCount(0);
        setError("The gallery could not be loaded right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const refetch = useCallback(() => setAttempt((a) => a + 1), []);

  return { items, count, loading, error, refetch };
}
