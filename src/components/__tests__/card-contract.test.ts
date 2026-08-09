// Card contract tests (plan portfolio-card-system T4).
// Validates the shared fixture/contract module BEFORE card implementation:
// - CARD_MEDIA_ASPECT_RATIO is exactly 16 / 9.
// - Every required test id is present and unique.
// - Fixtures are concrete for every state (no undefined media).
// - Visible copy register: no em-dashes, attribution present (R3).
// The DOM-level rendering contract (no nested interactive elements, ratio
// on the rendered media box) is asserted by the T6 component tests, which
// consume these same constants.

import { describe, it, expect } from "vitest";

import { GalleryItemSummarySchema } from "@/domain/curation/schemas";
import {
  CARD_COPY,
  CARD_FIXTURE_IDS,
  CARD_FIXTURES,
  CARD_MEDIA_ASPECT_RATIO,
  CARD_TEST_IDS,
} from "@/components/gallery-card-fixtures";

describe("card media ratio contract", () => {
  it("is exactly 16 / 9", () => {
    expect(CARD_MEDIA_ASPECT_RATIO).toBe("16 / 9");
  });
});

describe("card test-id contract", () => {
  it("defines every required selector", () => {
    for (const id of [
      "card",
      "media",
      "mediaFallback",
      "title",
      "creator",
      "role",
      "stack",
      "style",
      "freshness",
      "quality",
      "source",
      "bookmark",
      "preview",
      "previewPanel",
      "sample",
    ]) {
      expect(CARD_TEST_IDS[id as keyof typeof CARD_TEST_IDS], `missing ${id}`).toBeTruthy();
    }
  });

  it("has unique test-id values", () => {
    const values = Object.values(CARD_TEST_IDS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("card fixture coverage", () => {
  it("covers every required card state with concrete data", () => {
    const fixtures = Object.values(CARD_FIXTURES);
    expect(fixtures.length).toBeGreaterThanOrEqual(9);

    for (const item of fixtures) {
      // No undefined media fixture - every state has a concrete value
      // (null explicitly means "no curated media yet"; __broken__ simulates
      // a failing image via the URL itself).
      expect(
        item.mediaUrl === null ||
          item.mediaUrl === "https://cdn.example.com/missing.webp" ||
          item.mediaUrl.startsWith("https://cdn.example.com/"),
        `fixture ${item.id} has an unexpected mediaUrl ${item.mediaUrl}`,
      ).toBe(true);
      // Attribution is always present (R3).
      expect(item.attribution.creatorName.length).toBeGreaterThan(0);
      expect(item.attribution.sourceUrl).toMatch(/^https:\/\//);
      // stackTags is always an array.
      expect(Array.isArray(item.stackTags)).toBe(true);
    }
  });

  it("has unique fixture ids", () => {
    expect(new Set(CARD_FIXTURE_IDS).size).toBe(CARD_FIXTURE_IDS.length);
  });

  it("covers the specific media states", () => {
    expect(CARD_FIXTURES.mediaPresent.mediaUrl).toMatch(/^https:\/\//);
    expect(CARD_FIXTURES.mediaNull.mediaUrl).toBeNull();
    expect(CARD_FIXTURES.brokenMedia.mediaUrl).toContain("missing");
    expect(CARD_FIXTURES.recent.reviewedAt).toBe("2026-07-20T12:00:00.000Z");
    expect(CARD_FIXTURES.stale.reviewedAt).toBe("2024-01-01T12:00:00.000Z");
  });

  it("all fixtures validate against the safe summary schema", () => {
    for (const item of Object.values(CARD_FIXTURES)) {
      const result = GalleryItemSummarySchema.safeParse(item);
      expect(result.success, `fixture ${item.id} failed schema: ${JSON.stringify(result.success ? "" : result.error.issues)}`).toBe(true);
    }
  });
});

describe("card copy register", () => {
  it("contains no em-dashes (U+2014) in visible copy", () => {
    for (const key of Object.keys(CARD_COPY) as (keyof typeof CARD_COPY)[]) {
      const value = CARD_COPY[key];
      expect(value.includes("\u2014"), `em-dash in ${key}`).toBe(false);
    }
    for (const item of Object.values(CARD_FIXTURES)) {
      expect(item.title.includes("\u2014"), `em-dash in ${item.id} title`).toBe(false);
    }
  });
});
