import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  GalleryItemSummarySchema,
  ProvenanceSummarySchema,
  StructuralLessonSchema,
} from "@/domain/curation/schemas";

// ─── Existing summaries remain parseable ─────────────────────────────────

describe("safe projection: backward compatibility", () => {
  const legacySummary = {
    id: "item_1",
    title: "Jane's Portfolio",
    creatorRole: "designer",
    styleTags: ["minimal"],
    qualityLevel: "L3",
    complianceStatus: "PASS",
    status: "ACCEPTED",
    attribution: {
      creatorName: "Jane Doe",
      sourceUrl: "https://jane-doe.com/portfolio",
      licenseType: "CC_BY",
      consentDate: "2026-01-15T00:00:00.000Z",
    },
    consentTier: "PATTERN_DERIVE",
    reviewedAt: "2026-01-20T00:00:00.000Z",
    duplicateOfId: null,
    // Portfolio card system (T1): card metadata defaults on legacy summaries.
    mediaUrl: null,
    stackTags: [],
  };

  it("parses a legacy summary without a provenance field", () => {
    const r = GalleryItemSummarySchema.safeParse(legacySummary);
    expect(r.success).toBe(true);
  });

  it("parses a summary with a valid provenance summary", () => {
    const r = GalleryItemSummarySchema.safeParse({
      ...legacySummary,
      provenance: {
        hasCreator: true,
        hasSourceRecord: true,
        hasAiProvenance: true,
        hasConsent: true,
        aiDisclosure: "AI_ASSISTED",
        creator: { id: "creator_1", name: "Jane Doe", verificationStatus: "UNVERIFIED" },
        licence: { id: "CC_BY", effectivePermission: "PATTERN_DERIVE" },
        source: {
          sourceUrl: "https://jane-doe.com/portfolio",
          canonicalUrl: "https://jane-doe.com/portfolio",
          captureMode: "MANUAL_SUBMISSION",
          capturedAt: "2026-01-15T00:00:00.000Z",
        },
        removalAvailable: true,
      },
    });
    expect(r.success).toBe(true);
  });
});

// ─── Safe projections always carry attribution (R3) ──────────────────────

describe("safe projection: attribution integrity", () => {
  it("requires attribution fields on every summary", () => {
    const r = GalleryItemSummarySchema.safeParse({
      id: "item_2",
      title: "No attribution",
      creatorRole: "dev",
      styleTags: [],
      qualityLevel: "L2",
      complianceStatus: "PASS",
      status: "PENDING_REVIEW",
      consentTier: "DISPLAY",
      reviewedAt: null,
      duplicateOfId: null,
      // attribution intentionally missing
    });
    expect(r.success).toBe(false);
  });
});

// ─── Prohibited-field fixtures fail strict parsing ───────────────────────

describe("safe projection: prohibited fields rejected", () => {
  const validProvenance = {
    hasCreator: true,
    hasSourceRecord: true,
    hasAiProvenance: false,
    hasConsent: true,
    aiDisclosure: "HUMAN",
    creator: { id: "c1", name: "Jane Doe", verificationStatus: "UNVERIFIED" },
    licence: { id: "CC_BY", effectivePermission: "PATTERN_DERIVE" },
    source: {
      sourceUrl: "https://jane-doe.com/portfolio",
      canonicalUrl: "https://jane-doe.com/portfolio",
      captureMode: "MANUAL_SUBMISSION",
      capturedAt: "2026-01-15T00:00:00.000Z",
    },
    removalAvailable: true,
  };

  it("rejects contentBlob smuggled into a provenance summary", () => {
    const r = ProvenanceSummarySchema.safeParse({
      ...validProvenance,
      contentBlob: "full raw copy of the portfolio",
    });
    expect(r.success).toBe(false);
  });

  it("rejects structureJSON smuggled into a provenance summary", () => {
    const r = ProvenanceSummarySchema.safeParse({
      ...validProvenance,
      structureJSON: { hero: { headline: "copy" } },
    });
    expect(r.success).toBe(false);
  });

  it("rejects claimant private evidence in a provenance summary", () => {
    const r = ProvenanceSummarySchema.safeParse({
      ...validProvenance,
      claimantContact: "jane@example.com",
    });
    expect(r.success).toBe(false);
  });

  it("rejects raw source captures and fingerprints", () => {
    const withRaw = ProvenanceSummarySchema.safeParse({
      ...validProvenance,
      rawSourceCapture: "<html>...</html>",
    });
    expect(withRaw.success).toBe(false);
    const withFingerprint = ProvenanceSummarySchema.safeParse({
      ...validProvenance,
      structureFingerprint: "abc123",
    });
    expect(withFingerprint.success).toBe(false);
  });
});

// ─── No tool returns contentBlob + structureJSON together ────────────────

describe("safe projection: no combined content+structure export", () => {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const domainDir = resolve(thisDir, "..", "..");

  it("no public contract schema contains both contentBlob and structureJSON", () => {
    const files = [
      resolve(domainDir, "curation", "schemas.ts"),
      resolve(domainDir, "provenance", "schemas.ts"),
      resolve(domainDir, "provenance", "types.ts"),
      resolve(domainDir, "provenance", "ports.ts"),
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf-8");
      // If a contract defined both fields, this would be a violation. Public
      // schemas must never combine them (ADR-0002 D7, ADR-0003 D9).
      // We check for FIELD DEFINITIONS (`contentBlob:`) not mere word mentions,
      // because prohibition comments legitimately name the forbidden fields.
      const hasContent = /contentBlob\s*:/.test(src);
      const hasStructure = /structureJSON\s*:/.test(src);
      expect(
        hasContent && hasStructure,
        `file ${f} defines both contentBlob and structureJSON fields`,
      ).toBe(false);
    }
  });

  it("ProvenanceSummarySchema is strict and rejects unknown keys", () => {
    const r = ProvenanceSummarySchema.safeParse({
      hasCreator: true,
      hasSourceRecord: true,
      hasAiProvenance: false,
      hasConsent: true,
      aiDisclosure: "HUMAN",
      creator: null,
      licence: null,
      source: null,
      removalAvailable: true,
      extraUnknownKey: "x",
    });
    expect(r.success).toBe(false);
  });
});

// ─── Valid >=3-source aggregate lesson passes (R2 floor) ─────────────────

describe("safe projection: structural lesson R2 floor", () => {
  const validLesson = {
    patternType: "hero_layout",
    sourceItemCount: 3,
    distinctCreatorCount: 2,
    sectionFrequency: { hero: 3, about: 2 },
    commonTags: ["minimal", "editorial"],
    averageSectionCount: 4.5,
  };

  it("passes a valid >=3-source aggregate lesson", () => {
    expect(StructuralLessonSchema.safeParse(validLesson).success).toBe(true);
  });

  it("rejects a lesson below the item floor", () => {
    expect(StructuralLessonSchema.safeParse({ ...validLesson, sourceItemCount: 2 }).success).toBe(false);
  });

  it("rejects a lesson below the creator floor", () => {
    expect(StructuralLessonSchema.safeParse({ ...validLesson, distinctCreatorCount: 1 }).success).toBe(false);
  });

  it("rejects a lesson carrying a single item's content", () => {
    const r = StructuralLessonSchema.safeParse({
      ...validLesson,
      verbatimSnippet: "their exact hero copy",
    });
    expect(r.success).toBe(false);
  });
});
