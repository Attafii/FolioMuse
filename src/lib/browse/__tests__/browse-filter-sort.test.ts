import { describe, it, expect } from "vitest";

import { filterItems } from "@/lib/browse/browse-filter";
import { sortItems } from "@/lib/browse/browse-sort";
import type { BrowseState } from "@/lib/browse/browse-types";
import type { GalleryItemSummary } from "@/domain/curation/types";

function makeItem(overrides: Partial<GalleryItemSummary>): GalleryItemSummary {
  return {
    id: "item-1",
    title: "Untitled",
    creatorRole: "Designer",
    styleTags: [],
    qualityLevel: "L3",
    complianceStatus: "PASS",
    status: "ACCEPTED",
    attribution: {
      creatorName: "Creator",
      sourceUrl: "https://example.com/work",
      licenseType: "EXPLICIT_PERMISSION",
      consentDate: "2026-01-01T00:00:00.000Z",
    },
    consentTier: "DISPLAY",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    duplicateOfId: null,
    mediaUrl: null,
    stackTags: [],
    ...overrides,
  };
}

function state(overrides: Partial<BrowseState> = {}): BrowseState {
  return {
    q: "",
    roles: [],
    styles: [],
    quality: [],
    consent: [],
    sort: "newest",
    page: 1,
    ...overrides,
  };
}

const ITEMS: GalleryItemSummary[] = [
  makeItem({
    id: "a",
    title: "Aurora Studio",
    creatorRole: "Product Designer",
    styleTags: ["Minimal", "Editorial"],
    qualityLevel: "L4",
    consentTier: "FULL",
    reviewedAt: "2026-06-10T00:00:00.000Z",
  }),
  makeItem({
    id: "b",
    title: "Signal and Form",
    creatorRole: "Product Designer",
    styleTags: ["Minimal"],
    qualityLevel: "L3",
    consentTier: "PATTERN_DERIVE",
    reviewedAt: "2026-06-05T00:00:00.000Z",
  }),
  makeItem({
    id: "c",
    title: "Wild Type Specimen",
    creatorRole: "Illustrator",
    styleTags: ["Editorial", "Brutalist"],
    qualityLevel: "L2",
    consentTier: "DISPLAY",
    reviewedAt: null,
  }),
];

describe("filterItems", () => {
  it("returns all items when no constraints are set", () => {
    expect(filterItems(ITEMS, state())).toHaveLength(3);
  });

  it("matches search across title, creatorRole, and styleTags (case-insensitive)", () => {
    expect(filterItems(ITEMS, state({ q: "aurora" })).map((i) => i.id)).toEqual(["a"]);
    expect(filterItems(ITEMS, state({ q: "illustrator" })).map((i) => i.id)).toEqual(["c"]);
    expect(filterItems(ITEMS, state({ q: "minimal" })).map((i) => i.id).sort()).toEqual([
      "a",
      "b",
    ]);
    expect(filterItems(ITEMS, state({ q: "MINIMAL" })).map((i) => i.id).sort()).toEqual([
      "a",
      "b",
    ]);
  });

  it("role filter matches ANY selected role (OR within facet), case-insensitive", () => {
    const result = filterItems(
      ITEMS,
      state({ roles: ["product designer", "illustrator"] }),
    );
    expect(result.map((i) => i.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("style filter matches ANY selected style (OR within facet), case-insensitive", () => {
    const result = filterItems(ITEMS, state({ styles: ["brutalist"] }));
    expect(result.map((i) => i.id)).toEqual(["c"]);
  });

  it("combines facets with AND across dimensions", () => {
    const result = filterItems(
      ITEMS,
      state({ roles: ["product designer"], styles: ["minimal"], quality: ["L4"], consent: ["FULL"] }),
    );
    expect(result.map((i) => i.id)).toEqual(["a"]);
  });

  it("quality filter picks exact levels", () => {
    const result = filterItems(ITEMS, state({ quality: ["L2", "L3"] }));
    expect(result.map((i) => i.id).sort()).toEqual(["b", "c"]);
  });

  it("consent filter picks exact tiers", () => {
    const result = filterItems(ITEMS, state({ consent: ["PATTERN_DERIVE", "FULL"] }));
    expect(result.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const input = [...ITEMS];
    filterItems(input, state({ roles: ["illustrator"] }));
    expect(input).toHaveLength(3);
  });
});

describe("sortItems", () => {
  it("sorts by newest (reviewedAt desc), nulls last, title asc tie-break", () => {
    const result = sortItems(ITEMS, state({ sort: "newest" }));
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts title asc", () => {
    const result = sortItems(ITEMS, state({ sort: "title-asc" }));
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts title desc", () => {
    const result = sortItems(ITEMS, state({ sort: "title-desc" }));
    expect(result.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts by quality rank: L4 before L3 before L2, title asc tie-break", () => {
    const result = sortItems(ITEMS, state({ sort: "quality" }));
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("handles defensive L0/L1 quality levels without throwing", () => {
    const defensive = [
      makeItem({ id: "x", qualityLevel: "L1", title: "Alpha" }),
      makeItem({ id: "y", qualityLevel: "L0", title: "Beta" }),
    ];
    const result = sortItems(defensive, state({ sort: "quality" }));
    expect(result.map((i) => i.id)).toEqual(["x", "y"]);
  });

  it("does not mutate the input array", () => {
    const input = [...ITEMS];
    sortItems(input, state({ sort: "quality" }));
    expect(input.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
