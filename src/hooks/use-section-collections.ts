"use client";

import { useCallback, useSyncExternalStore } from "react";

import { createBookmarkStore } from "@/lib/bookmark-storage";

/**
 * Local-only section collections (plan section-library-detail T4, ADR-0008 D7).
 *
 * Reuses the SSR-safe bookmark store with a DISTINCT storage key so section
 * collections never collide with gallery-item bookmarks. No backend, no sync,
 * no auth. The caller fires COLLECTION_ADD telemetry on add (local removal is
 * state only - no unsave vocabulary).
 */

export const SECTION_COLLECTIONS_KEY = "foliomuse-section-collections";

const sectionStore = createBookmarkStore(
  () => (typeof window === "undefined" ? null : window.localStorage),
  SECTION_COLLECTIONS_KEY,
);

// Stable empty snapshot for SSR/prerender (React 19 memoization requirement).
const SERVER_SNAPSHOT: ReadonlySet<string> = new Set();

export function useSectionCollections(): {
  isCollected: (sectionId: string) => boolean;
  toggle: (sectionId: string) => void;
} {
  const ids = useSyncExternalStore(
    sectionStore.subscribe,
    sectionStore.getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const isCollected = useCallback((sectionId: string) => ids.has(sectionId), [ids]);
  const toggle = useCallback((sectionId: string) => sectionStore.toggle(sectionId), []);

  return { isCollected, toggle };
}
