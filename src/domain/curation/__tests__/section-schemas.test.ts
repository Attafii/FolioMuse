// Section library strict schemas + taxonomy tests (plan section-library T2).
// Closed taxonomy vocabulary, strict SectionCard/SectionDetail projections,
// curated lesson reason codes, and prohibited-field rejection (no raw
// content/structure/claimant data).

import { describe, it, expect } from "vitest";

import {
  SECTION_TYPES,
  SectionTypeSchema,
  LessonCodeSchema,
  SectionCardSchema,
  SectionDetailSchema,
  type SectionCard,
  type SectionDetail,
} from "@/domain/curation/section-schemas";

function baseCard(overrides: Record<string, unknown> = {}): SectionCard {
  return {
    id: "section-1",
    sectionType: "hero",
    title: "Editorial hero",
    creatorName: "Jane Doe",
    creatorRole: "Product Designer",
    desktopCropUrl: "https://cdn.example.com/hero-desktop.webp",
    mobileCropUrl: null,
    itemId: "item-1",
    ...overrides,
  };
}

function baseDetail(overrides: Record<string, unknown> = {}): SectionDetail {
  return {
    ...baseCard(),
    styleTags: ["minimal", "editorial"],
    stackTags: ["React"],
    lessons: [{ code: "CLARITY", label: "Clear single message" }],
    aggregateLessons: [
      {
        patternType: "hero",
        sourceItemCount: 3,
        distinctCreatorCount: 2,
        sectionFrequency: { hero: 3 },
        commonTags: ["minimal"],
        averageSectionCount: 1,
      },
    ],
    aggregateFloorMet: true,
    doNotCopyNote: "Do not copy this hero verbatim - use it as a structural reference only.",
    attribution: {
      creatorName: "Jane Doe",
      sourceUrl: "https://jane-doe.com/portfolio",
      licenseType: "EXPLICIT_PERMISSION",
      consentDate: "2026-01-15T00:00:00.000Z",
    },
    similarSections: [],
    ...overrides,
  };
}

describe("SectionTypeSchema + taxonomy", () => {
  it("accepts every closed taxonomy type", () => {
    for (const type of SECTION_TYPES) {
      expect(SectionTypeSchema.safeParse(type).success, `type ${type}`).toBe(true);
    }
  });

  it("rejects unknown, empty, and non-string types", () => {
    expect(SectionTypeSchema.safeParse("mystery-section").success).toBe(false);
    expect(SectionTypeSchema.safeParse("").success).toBe(false);
    expect(SectionTypeSchema.safeParse(123).success).toBe(false);
  });
});

describe("LessonCodeSchema", () => {
  it("accepts curated lesson codes", () => {
    for (const code of ["CLARITY", "HIERARCHY", "FOCUS", "MOTION", "ACCESSIBILITY"]) {
      expect(LessonCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it("rejects free-form lesson codes", () => {
    expect(LessonCodeSchema.safeParse("AI_PROSE_SUMMARY").success).toBe(false);
  });
});

describe("SectionCardSchema", () => {
  it("parses a valid card", () => {
    const result = SectionCardSchema.safeParse(baseCard());
    expect(result.success).toBe(true);
  });

  it("rejects invalid crop URLs (non-HTTPS/private host)", () => {
    expect(SectionCardSchema.safeParse(baseCard({ desktopCropUrl: "http://x.webp" })).success).toBe(false);
    expect(SectionCardSchema.safeParse(baseCard({ desktopCropUrl: "https://localhost/x.webp" })).success).toBe(false);
  });

  it("rejects prohibited fields (strict)", () => {
    for (const [key, value] of [
      ["contentBlob", "raw"],
      ["structureJSON", { hero: 1 }],
      ["claimantContact", "e@x.com"],
      ["evidenceHash", "abc"],
      ["unknownKey", true],
    ] as const) {
      expect(SectionCardSchema.safeParse(baseCard({ [key]: value })).success, `field ${key}`).toBe(false);
    }
  });
});

describe("SectionDetailSchema", () => {
  it("parses a valid full-context detail", () => {
    const result = SectionDetailSchema.safeParse(baseDetail());
    expect(result.success, JSON.stringify(result.success ? "" : result.error.issues)).toBe(true);
  });

  it("accepts a below-floor aggregate state (insufficient data)", () => {
    const result = SectionDetailSchema.safeParse(
      baseDetail({ aggregateFloorMet: false, aggregateLessons: [] }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects prohibited fields and unknown keys (strict)", () => {
    for (const [key, value] of [
      ["contentBlob", "raw"],
      ["structureJSON", { hero: 1 }],
      ["claimantContact", "e@x.com"],
      ["structureFingerprint", "abc"],
    ] as const) {
      expect(SectionDetailSchema.safeParse(baseDetail({ [key]: value })).success, `field ${key}`).toBe(false);
    }
    expect(SectionDetailSchema.safeParse(baseDetail({ unknownKey: true })).success).toBe(false);
  });

  it("enforces lesson code bounds and note bounds", () => {
    expect(SectionDetailSchema.safeParse(baseDetail({ lessons: [{ code: "FREE_TEXT", label: "x" }] })).success).toBe(false);
    expect(SectionDetailSchema.safeParse(baseDetail({ doNotCopyNote: "x".repeat(601) })).success).toBe(false);
  });
});
