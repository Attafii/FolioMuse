// Bookmark storage unit tests (plan portfolio-card-system T3).
// Pure-node Vitest: uses an injected mock Storage (no jsdom dependency).
// Covers: parse/dedupe, write persistence, malformed data, storage
// exceptions, toggle idempotence, reload simulation, storage-event sync.

import { describe, it, expect, beforeEach } from "vitest";

import {
  BOOKMARK_STORAGE_KEY,
  createBookmarkStore,
  parseStoredBookmarks,
  serializeBookmarks,
  toggleBookmarkId,
  type BookmarkStorage,
} from "@/lib/bookmark-storage";

/** In-memory Storage implementing the minimal Storage surface we use. */
function createMockStorage(initial: Record<string, string> = {}): BookmarkStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("parseStoredBookmarks", () => {
  it("returns an empty set for null/undefined input", () => {
    expect(parseStoredBookmarks(null)).toEqual(new Set());
    expect(parseStoredBookmarks(undefined)).toEqual(new Set());
  });

  it("parses a valid JSON array of strings", () => {
    const ids = parseStoredBookmarks('["a","b"]');
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("dedupes repeated ids", () => {
    const ids = parseStoredBookmarks('["a","a","b"]');
    expect(ids.size).toBe(2);
  });

  it("filters non-string entries", () => {
    const ids = parseStoredBookmarks('["a",42,{"x":1},null,"b"]');
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("returns an empty set for malformed JSON", () => {
    expect(parseStoredBookmarks("not-json{")).toEqual(new Set());
    expect(parseStoredBookmarks("")).toEqual(new Set());
  });
});

describe("serializeBookmarks", () => {
  it("serializes a set of ids deterministically", () => {
    expect(serializeBookmarks(new Set(["b", "a"]))).toBe('["a","b"]');
  });

  it("serializes an empty set as an empty array", () => {
    expect(serializeBookmarks(new Set())).toBe("[]");
  });
});

describe("toggleBookmarkId", () => {
  it("adds an id not already present", () => {
    expect(toggleBookmarkId(new Set(["a"]), "b")).toEqual(new Set(["a", "b"]));
  });

  it("removes an id already present (idempotent toggle)", () => {
    expect(toggleBookmarkId(new Set(["a", "b"]), "a")).toEqual(new Set(["b"]));
  });

  it("returns a new set reference (immutability)", () => {
    const input = new Set(["a"]);
    const output = toggleBookmarkId(input, "b");
    expect(output).not.toBe(input);
    expect(input.has("b")).toBe(false);
  });
});

describe("createBookmarkStore", () => {
  let storage: BookmarkStorage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it("starts empty when storage is empty", () => {
    const store = createBookmarkStore(() => storage);
    expect(store.getSnapshot()).toEqual(new Set());
  });

  it("hydrates from existing storage on creation (reload simulation)", () => {
    storage.setItem(BOOKMARK_STORAGE_KEY, '["item-123"]');
    const store = createBookmarkStore(() => storage);
    expect(store.getSnapshot()).toEqual(new Set(["item-123"]));
  });

  it("toggle persists to storage and notifies subscribers", () => {
    const store = createBookmarkStore(() => storage);
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });

    store.toggle("item-1");
    expect(store.getSnapshot()).toEqual(new Set(["item-1"]));
    expect(storage.getItem(BOOKMARK_STORAGE_KEY)).toBe('["item-1"]');
    expect(notified).toBe(1);

    store.toggle("item-1");
    expect(store.getSnapshot()).toEqual(new Set());
    expect(storage.getItem(BOOKMARK_STORAGE_KEY)).toBe("[]");
    expect(notified).toBe(2);
  });

  it("survives a simulated reload (new store, same storage)", () => {
    const first = createBookmarkStore(() => storage);
    first.toggle("persist-me");

    const second = createBookmarkStore(() => storage);
    expect(second.getSnapshot()).toEqual(new Set(["persist-me"]));
  });

  it("deals safely with throwing storage getItem", () => {
    const throwing: BookmarkStorage = {
      getItem: () => {
        throw new Error("SecurityError: storage disabled");
      },
      setItem: () => {
        throw new Error("SecurityError: storage disabled");
      },
      removeItem: () => {
        throw new Error("SecurityError: storage disabled");
      },
    };
    const store = createBookmarkStore(() => throwing);
    // Hydration must not throw.
    expect(store.getSnapshot()).toEqual(new Set());
    // Toggle must not throw and must degrade to in-memory behavior.
    expect(() => store.toggle("mem-only")).not.toThrow();
    expect(store.getSnapshot()).toEqual(new Set(["mem-only"]));
  });

  it("deals safely with throwing storage setItem (quota/private mode)", () => {
    const broken: BookmarkStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const store = createBookmarkStore(() => broken);
    expect(() => store.toggle("quota-item")).not.toThrow();
    expect(store.getSnapshot()).toEqual(new Set(["quota-item"]));
  });

  it("synchronizes from a storage event (cross-tab local sync)", () => {
    const store = createBookmarkStore(() => storage);
    // Simulate another tab writing to the same key.
    storage.setItem(BOOKMARK_STORAGE_KEY, '["other-tab"]');
    const handler = store["handleStorageEvent"];
    if (handler) {
      handler({ key: BOOKMARK_STORAGE_KEY } as StorageEvent);
    }
    expect(store.getSnapshot()).toEqual(new Set(["other-tab"]));
  });

  it("ignores storage events for unrelated keys", () => {
    const store = createBookmarkStore(() => storage);
    storage.setItem("some-other-key", '["x"]');
    const handler = store["handleStorageEvent"];
    if (handler) {
      handler({ key: "some-other-key" } as StorageEvent);
    }
    expect(store.getSnapshot()).toEqual(new Set());
  });
});
