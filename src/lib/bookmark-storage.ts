// Local-only bookmark storage (plan portfolio-card-system T3).
//
// SSR-safe, dependency-free bookmark state for the portfolio card system.
// - Pure functions operate on an injected Storage-like interface so unit
//   tests run in node without jsdom.
// - The store mirrors the useSyncExternalStore discipline used by
//   use-gallery-summaries: deterministic snapshot, subscribe/notify, and a
//   storage-event listener for same-origin cross-tab synchronization.
// - Every storage access is defensive: unavailable/quota/private-mode
//   storage degrades to in-memory behavior and never throws to the UI.
// - Bookmarks are LOCAL ONLY (ADR-0006 D4): no backend model, no API, no
//   auth, no cross-device sync. Never emit stored ids in telemetry.

export const BOOKMARK_STORAGE_KEY = "foliomuse-bookmarks";

/** Minimal Storage surface the bookmark store depends on. */
export interface BookmarkStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Parse stored JSON into a Set of valid string ids. Never throws. */
export function parseStoredBookmarks(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const ids = new Set<string>();
    for (const entry of parsed) {
      if (typeof entry === "string" && entry.length > 0) ids.add(entry);
    }
    return ids;
  } catch {
    return new Set();
  }
}

/** Serialize a Set of ids deterministically (sorted). */
export function serializeBookmarks(ids: Set<string>): string {
  return JSON.stringify([...ids].sort());
}

/** Toggle an id in a new Set (immutable). */
export function toggleBookmarkId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export interface BookmarkStore {
  getSnapshot: () => Set<string>;
  subscribe: (listener: () => void) => () => void;
  toggle: (itemId: string) => void;
  /** Internal: exposed for cross-tab storage-event tests. */
  handleStorageEvent: (event: StorageEvent) => void;
}

/**
 * Create a bookmark store bound to a storage provider.
 * `getStorage` is a function so tests can swap storage between stores.
 */
export function createBookmarkStore(getStorage: () => BookmarkStorage | null): BookmarkStore {
  let ids = readIds();

  function readIds(): Set<string> {
    try {
      return parseStoredBookmarks(getStorage()?.getItem(BOOKMARK_STORAGE_KEY) ?? null);
    } catch {
      return new Set();
    }
  }

  function writeIds(next: Set<string>): void {
    try {
      getStorage()?.setItem(BOOKMARK_STORAGE_KEY, serializeBookmarks(next));
    } catch {
      // Storage unavailable/quota/private mode: keep in-memory behavior only.
    }
  }

  const listeners = new Set<() => void>();
  function notify() {
    for (const listener of listeners) listener();
  }
  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function toggle(itemId: string) {
    ids = toggleBookmarkId(ids, itemId);
    writeIds(ids);
    notify();
  }

  function handleStorageEvent(event: StorageEvent) {
    if (event.key !== BOOKMARK_STORAGE_KEY) return;
    ids = readIds();
    notify();
  }

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", handleStorageEvent);
  }

  return { getSnapshot: () => ids, subscribe, toggle, handleStorageEvent };
}
