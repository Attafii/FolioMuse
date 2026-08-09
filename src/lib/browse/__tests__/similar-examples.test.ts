// Deterministic similar-example selection tests (plan portfolio-detail-page T6).
// Pure metadata overlap on styleTags + stackTags; no ranking/flywheel/pattern
// dependency. Excludes self and ineligible candidates; deterministic ordering.

import { describe, it, expect } from "vitest";

import { selectSimilarExamples } from "@/lib/browse/similar-examples";
import type { GalleryItemSummary } from "@/domain/curation/types";

function makeItem(id: string, overrides: Partial<GalleryItemSummary> = {}): GalleryItemSummary {
  return {
    id,
    title: `Portfolio ${id}`,
    creatorRole: "Product Designer",
    styleTags: [],
    stackTags: [],
    qualityLevel: "L3",
    complianceStatus: "PASS",
    status: "ACCEPTED",
    attribution: {
      creatorName: `Creator ${id}`,
      sourceUrl: `https://example.com/${id}`,
      licenseType: "EXPLICIT_PERMISSION",
      consentDate: "2026-01-15T00:00:00.000Z",
    },
    consentTier: "DISPLAY",
    reviewedAt: "2026-06-01T12:00:00.000Z",
    duplicateOfId: null,
    mediaUrl: null,
    ...overrides,
  };
}

describe("selectSimilarExamples", () => {
  const source = makeItem("item-a", { styleTags: ["minimal", "dark"], stackTags: ["React", "Tailwind"] });

  it("excludes the source item itself", () => {
    const result = selectSimilarExamples(source, [source, makeItem("item-b", { styleTags: ["minimal"] })]);
    expect(result.map((i) => i.id)).toEqual(["item-b"]);
  });

  it("returns only candidates sharing at least one normalized tag", () => {
    const result = selectSimilarExamples(source, [
      makeItem("item-b", { styleTags: ["minimal"] }),
      makeItem("item-c", { styleTags: ["editorial"] }),
      makeItem("item-d", { stackTags: ["React"] }),
    ]);
    expect(result.map((i) => i.id)).toEqual(["item-b", "item-d"]);
  });

  it("orders by overlap count DESC then reviewedAt DESC then id ASC", () => {
    const result = selectSimilarExamples(source, [
      makeItem("item-1", { styleTags: ["minimal"] }), // 1 overlap
      makeItem("item-2", { styleTags: ["minimal", "dark"], stackTags: ["React"] }), // 3 overlap
      makeItem("item-3", { styleTags: ["minimal", "dark"], reviewedAt: "2026-05-01T12:00:00.000Z" }), // 2 overlap, older
      makeItem("item-4", { styleTags: ["minimal", "dark"], reviewedAt: "2026-06-01T12:00:00.000Z" }), // 2 overlap, newer
    ]);
    expect(result.map((i) => i.id)).toEqual(["item-2", "item-4", "item-3", "item-1"]);
  });

  it("caps output at the default max of 4", () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      makeItem(`item-${i}`, { styleTags: ["minimal"] }),
    );
    const result = selectSimilarExamples(source, candidates);
    expect(result.length).toBe(4);
  });

  it("respects a custom max", () => {
    const candidates = Array.from({ length: 6 }, (_, i) =>
      makeItem(`item-${i}`, { stackTags: ["Tailwind"] }),
    );
    expect(selectSimilarExamples(source, candidates, { max: 2 }).length).toBe(2);
  });

  it("normalizes case and trims tags", () => {
    const result = selectSimilarExamples(
      makeItem("source", { styleTags: [" Minimal "], stackTags: ["react"] }),
      [makeItem("item-b", { styleTags: ["minimal"] }), makeItem("item-c", { stackTags: ["React"] })],
    );
    expect(result.map((i) => i.id)).toEqual(["item-b", "item-c"]);
  });

  it("dedupes identical tags within a candidate", () => {
    const result = selectSimilarExamples(
      makeItem("source", { styleTags: ["minimal"] }),
      [makeItem("item-b", { styleTags: ["minimal", "minimal", " MINIMAL "] })],
    );
    // Single distinct overlap still ranks; no double counting to inflate order.
    expect(result.map((i) => i.id)).toEqual(["item-b"]);
  });

  it("returns an empty array when no candidate shares a tag", () => {
    const result = selectSimilarExamples(source, [
      makeItem("item-z", { styleTags: ["editorial"], stackTags: ["Vue"] }),
    ]);
    expect(result).toEqual([]);
  });

  it("returns an empty array for empty candidate lists", () => {
    expect(selectSimilarExamples(source, [])).toEqual([]);
  });

  it("preserves full safe summaries (attribution intact) in output", () => {
    const candidate = makeItem("item-b", { styleTags: ["minimal"] });
    const [result] = selectSimilarExamples(source, [candidate]);
    expect(result.attribution.creatorName).toBe("Creator item-b");
    expect(result.attribution.sourceUrl).toBe("https://example.com/item-b");
    expect(result.qualityLevel).toBe("L3");
  });
});
