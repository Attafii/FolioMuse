// Section collection store tests (plan section-library-detail T4).
// Proves the section-collection namespace is distinct from gallery-item
// bookmarks and uses the same SSR-safe/local store mechanics.

import { describe, it, expect } from "vitest";

import {
  BOOKMARK_STORAGE_KEY,
  createBookmarkStore,
} from "@/lib/bookmark-storage";
import { SECTION_COLLECTIONS_KEY } from "@/hooks/use-section-collections";

function createMockStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

describe("section collection namespace", () => {
  it("persists under the distinct section-collections key", () => {
    const storage = createMockStorage();
    const store = createBookmarkStore(() => storage, SECTION_COLLECTIONS_KEY);

    store.toggle("section-1");
    expect(storage.getItem(SECTION_COLLECTIONS_KEY)).toBe('["section-1"]');
    // Bookmarks key is untouched.
    expect(storage.getItem(BOOKMARK_STORAGE_KEY)).toBeNull();
  });

  it("does not collide with the bookmark namespace", () => {
    const storage = createMockStorage();
    const bookmarkStore = createBookmarkStore(() => storage); // default key
    const sectionStore = createBookmarkStore(() => storage, SECTION_COLLECTIONS_KEY);

    bookmarkStore.toggle("item-9");
    sectionStore.toggle("section-1");

    expect(bookmarkStore.getSnapshot()).toEqual(new Set(["item-9"]));
    expect(sectionStore.getSnapshot()).toEqual(new Set(["section-1"]));
    expect(storage.getItem(BOOKMARK_STORAGE_KEY)).toBe('["item-9"]');
    expect(storage.getItem(SECTION_COLLECTIONS_KEY)).toBe('["section-1"]');
  });

  it("hydrates from the distinct key on reload", () => {
    const storage = createMockStorage({ [SECTION_COLLECTIONS_KEY]: '["section-2"]' });
    const store = createBookmarkStore(() => storage, SECTION_COLLECTIONS_KEY);
    expect(store.getSnapshot()).toEqual(new Set(["section-2"]));
  });

  it("degrades safely on throwing storage", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const store = createBookmarkStore(() => throwing, SECTION_COLLECTIONS_KEY);
    expect(store.getSnapshot()).toEqual(new Set());
    expect(() => store.toggle("section-x")).not.toThrow();
    expect(store.getSnapshot()).toEqual(new Set(["section-x"]));
  });
});
