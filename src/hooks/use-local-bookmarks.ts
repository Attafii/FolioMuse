"use client";

import { useCallback, useSyncExternalStore } from "react";

import { createBookmarkStore } from "@/lib/bookmark-storage";

/**
 * SSR-safe local bookmark hook for the portfolio card system (plan T3).
 *
 * - Bookmarks are LOCAL ONLY (ADR-0006 D4): persisted in localStorage under
 *   `foliomuse-bookmarks`, no backend/auth/sync.
 * - SSR/first client render return the empty server snapshot (no `window`
 *   access, no hydration mismatch); the store hydrates from localStorage
 *   once the client is live.
 * - Cross-tab same-origin changes synchronize via the `storage` event.
 * - Storage failures degrade to in-memory behavior and never throw.
 *
 * Use `isBookmarked(id)` + `toggle(id)` from card bookmark controls (T8).
 */

// Module-level singleton store bound to the browser localStorage.
const store = createBookmarkStore(() =>
  typeof window === "undefined" ? null : window.localStorage,
);

// Stable empty snapshot for SSR/prerender (React 19 requires a memoized
// getServerSnapshot to avoid infinite-loop warnings).
const SERVER_SNAPSHOT: ReadonlySet<string> = new Set();

export function useLocalBookmarks(): {
  isBookmarked: (itemId: string) => boolean;
  toggle: (itemId: string) => void;
} {
  const ids = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const isBookmarked = useCallback(
    (itemId: string) => ids.has(itemId),
    [ids],
  );
  const toggle = useCallback((itemId: string) => store.toggle(itemId), []);

  return { isBookmarked, toggle };
}


/**
 * Liked-page helper: the full id set as a stable sorted array.
 * Separate from useLocalBookmarks so cards keep the cheap boolean API while
 * list views can react to the actual collection.
 */
export function useLocalBookmarkIds(): string[] {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => SERVER_SNAPSHOT,
  );
  return [...snapshot].sort();
}
