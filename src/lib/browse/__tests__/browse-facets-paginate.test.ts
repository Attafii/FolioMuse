import { describe, it, expect } from "vitest";

import { deriveFacets } from "@/lib/browse/browse-facets";
import { paginateItems } from "@/lib/browse/browse-paginate";
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

const ITEMS: GalleryItemSummary[] = [
  makeItem({
    id: "a",
    title: "Aurora Studio",
    creatorRole: "Product Designer",
    styleTags: ["Minimal", "Editorial"],
    qualityLevel: "L4",
    consentTier: "FULL",
  }),
  makeItem({
    id: "b",
    title: "Signal and Form",
    creatorRole: "Product Designer",
    styleTags: ["Minimal"],
    qualityLevel: "L3",
    consentTier: "PATTERN_DERIVE",
  }),
  makeItem({
    id: "c",
    title: "Wild Type Specimen",
    creatorRole: "Illustrator",
    styleTags: ["Editorial", "Brutalist"],
    qualityLevel: "L2",
    consentTier: "DISPLAY",
  }),
];

describe("deriveFacets", () => {
  it("derives role facets with exact counts, sorted by count desc then label asc", () => {
    const { roles } = deriveFacets(ITEMS);
    expect(roles).toEqual([
      { value: "Product Designer", count: 2 },
      { value: "Illustrator", count: 1 },
    ]);
  });

  it("counts each style tag per item (multi-tag items contribute each tag)", () => {
    const { styles } = deriveFacets(ITEMS);
    expect(styles).toEqual([
      { value: "Editorial", count: 2 },
      { value: "Minimal", count: 2 },
      { value: "Brutalist", count: 1 },
    ]);
  });

  it("derives quality and consent facets with counts (label asc tie-break)", () => {
    const { qualities, consents } = deriveFacets(ITEMS);
    expect(qualities).toEqual([
      { value: "L2", count: 1 },
      { value: "L3", count: 1 },
      { value: "L4", count: 1 },
    ]);
    expect(consents).toEqual([
      { value: "DISPLAY", count: 1 },
      { value: "FULL", count: 1 },
      { value: "PATTERN_DERIVE", count: 1 },
    ]);
  });

  it("dedupes case-insensitively and keeps original casing as label", () => {
    const items = [
      makeItem({ id: "a", creatorRole: "Illustrator", styleTags: ["Minimal"] }),
      makeItem({ id: "b", creatorRole: "illustrator", styleTags: ["minimal"] }),
    ];
    const { roles, styles } = deriveFacets(items);
    expect(roles).toEqual([{ value: "Illustrator", count: 2 }]);
    expect(styles).toEqual([{ value: "Minimal", count: 2 }]);
  });

  it("returns empty facet arrays for an empty corpus", () => {
    const facets = deriveFacets([]);
    expect(facets).toEqual({ roles: [], styles: [], qualities: [], consents: [] });
  });
});

describe("paginateItems", () => {
  const TEN = Array.from({ length: 10 }, (_, i) =>
    makeItem({ id: `item-${i + 1}`, title: `Item ${i + 1}` }),
  );

  it("slices 10 items into 9 + 1 with totalPages 2", () => {
    const page1 = paginateItems(TEN, 1);
    expect(page1.pageItems).toHaveLength(9);
    expect(page1.totalPages).toBe(2);
    expect(page1.totalCount).toBe(10);
    expect(page1.page).toBe(1);

    const page2 = paginateItems(TEN, 2);
    expect(page2.pageItems).toHaveLength(1);
    expect(page2.page).toBe(2);
  });

  it("clamps page 0 to 1 and page 99 to the last page", () => {
    expect(paginateItems(TEN, 0).page).toBe(1);
    const last = paginateItems(TEN, 99);
    expect(last.page).toBe(2);
    expect(last.pageItems).toHaveLength(1);
  });

  it("handles an empty corpus: empty page 1, totalPages 1", () => {
    const result = paginateItems([], 1);
    expect(result.pageItems).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.totalCount).toBe(0);
  });

  it("does not mutate the input array", () => {
    const input = [...TEN];
    paginateItems(input, 2);
    expect(input).toHaveLength(10);
  });
});
