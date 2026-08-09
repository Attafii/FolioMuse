// Strict PortfolioDetail schema tests (plan portfolio-detail-page T2).
// Proves the attribution-safe detail DTO: bounded curated metadata, safe
// provenance, deterministic similar examples - and rejection of every
// prohibited field (contentBlob, structureJSON, raw captures, fingerprints,
// hashes, prompts, claimant evidence, unknown keys).

import { describe, it, expect } from "vitest";

import { PortfolioDetailSchema } from "@/domain/curation/detail-schemas";

const BASE = {
  id: "item-123",
  title: "Editorial Sample Portfolio",
  creatorRole: "Product Designer",
  styleTags: ["minimal", "editorial"],
  qualityLevel: "L3",
  complianceStatus: "PASS",
  status: "ACCEPTED",
  attribution: {
    creatorName: "Jane Doe",
    sourceUrl: "https://jane-doe.com/portfolio",
    licenseType: "EXPLICIT_PERMISSION",
    consentDate: "2026-01-15T00:00:00.000Z",
  },
  consentTier: "FULL",
  reviewedAt: "2026-06-01T12:00:00.000Z",
  duplicateOfId: null,
  mediaUrl: "https://cdn.example.com/card.webp",
  stackTags: ["React", "Tailwind"],
};

function validDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...BASE,
    provenance: {
      hasCreator: true,
      hasSourceRecord: true,
      hasAiProvenance: true,
      hasConsent: true,
      aiDisclosure: "AI_ASSISTED",
      creator: { id: "creator-1", name: "Jane Doe", verificationStatus: "UNVERIFIED" },
      licence: { id: "EXPLICIT_PERMISSION", effectivePermission: "FULL" },
      source: {
        sourceUrl: "https://jane-doe.com/portfolio",
        canonicalUrl: "https://jane-doe.com/portfolio",
        captureMode: "MANUAL_SUBMISSION",
        capturedAt: "2026-01-15T00:00:00.000Z",
      },
      removalAvailable: true,
    },
    desktopMediaUrl: "https://cdn.example.com/desktop.webp",
    mobileMediaUrl: "https://cdn.example.com/mobile.webp",
    pageIndex: ["Home", "Work", "About"],
    sections: [
      { key: "hero", label: "Hero", present: true },
      { key: "work", label: "Selected work", present: true },
    ],
    strengths: [
      { code: "QUALITY", label: "Strong curated quality" },
      { code: "STRUCTURE", label: "Clear structure" },
    ],
    stackEvidence: [
      { name: "React", evidenceType: "metadata" },
      { name: "Tailwind", evidenceType: "metadata" },
    ],
    captureFreshness: { capturedAt: "2026-01-15T00:00:00.000Z", label: "Captured 6 months ago" },
    similarExamples: [
      {
        id: "item-456",
        title: "Similar Portfolio",
        creatorRole: "Product Designer",
        styleTags: ["minimal"],
        stackTags: ["React"],
        qualityLevel: "L3",
        reviewedAt: "2026-06-01T12:00:00.000Z",
        mediaUrl: "https://cdn.example.com/similar.webp",
        attribution: {
          creatorName: "Jane Roe",
          sourceUrl: "https://jane-roe.com/portfolio",
          licenseType: "EXPLICIT_PERMISSION",
          consentDate: "2026-01-15T00:00:00.000Z",
        },
      },
    ],
    ...overrides,
  };
}

describe("PortfolioDetailSchema", () => {
  it("parses a valid safe detail record", () => {
    const result = PortfolioDetailSchema.safeParse(validDetail());
    expect(result.success, JSON.stringify(result.success ? "" : result.error.issues)).toBe(true);
  });

  it("parses a legacy record with null/empty detail metadata", () => {
    const result = PortfolioDetailSchema.safeParse({
      ...BASE,
      desktopMediaUrl: null,
      mobileMediaUrl: null,
      pageIndex: [],
      sections: null,
      strengths: null,
      stackEvidence: null,
      captureFreshness: { capturedAt: null, label: null },
      similarExamples: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects every prohibited field (strict anti-cloning boundary)", () => {
    for (const [key, value] of [
      ["contentBlob", "raw-content"],
      ["structureJSON", { hero: "x" }],
      ["claimantContact", "owner@example.com"],
      ["promptHash", "abc"],
      ["outputHash", "abc"],
      ["evidenceHash", "abc"],
      ["contentHash", "abc"],
      ["structureFingerprint", "abc"],
      ["rawCapture", "base64"],
      ["reviewerId", "reviewer-1"],
      ["unknownKey", true],
    ] as const) {
      const result = PortfolioDetailSchema.safeParse(validDetail({ [key]: value }));
      expect(result.success, `field ${key} must be rejected`).toBe(false);
    }
  });

  it("rejects non-HTTPS and private-host capture URLs", () => {
    expect(PortfolioDetailSchema.safeParse(validDetail({ desktopMediaUrl: "http://cdn.example.com/d.webp" })).success).toBe(false);
    expect(PortfolioDetailSchema.safeParse(validDetail({ mobileMediaUrl: "https://localhost/m.webp" })).success).toBe(false);
  });

  it("enforces descriptor bounds", () => {
    const tooManyIndex = validDetail({ pageIndex: Array.from({ length: 25 }, (_, i) => `Page ${i}`) });
    expect(PortfolioDetailSchema.safeParse(tooManyIndex).success).toBe(false);

    const badEvidenceType = validDetail({ stackEvidence: [{ name: "React", evidenceType: "raw" }] });
    expect(PortfolioDetailSchema.safeParse(badEvidenceType).success).toBe(false);

    const emptySectionLabel = validDetail({ sections: [{ key: "hero", label: "", present: true }] });
    expect(PortfolioDetailSchema.safeParse(emptySectionLabel).success).toBe(false);

    const badStrengthCode = validDetail({ strengths: [{ code: "AI_PROSE", label: "x" }] });
    expect(PortfolioDetailSchema.safeParse(badStrengthCode).success).toBe(false);
  });

  it("caps similar examples at 4", () => {
    const example = {
      id: "item-x",
      title: "Example",
      creatorRole: "Designer",
      styleTags: ["minimal"],
      stackTags: [],
      qualityLevel: "L3",
      reviewedAt: null,
      mediaUrl: null,
      attribution: {
        creatorName: "X",
        sourceUrl: "https://example.com/x",
        licenseType: "EXPLICIT_PERMISSION",
        consentDate: "2026-01-15T00:00:00.000Z",
      },
    };
    const many = validDetail({ similarExamples: [example, example, example, example, example] });
    expect(PortfolioDetailSchema.safeParse(many).success).toBe(false);
  });

  it("does not leak similar-example private/prohibited fields", () => {
    const leak = validDetail({
      similarExamples: [
        {
          id: "item-456",
          title: "Similar",
          creatorRole: "Designer",
          styleTags: ["minimal"],
          stackTags: [],
          qualityLevel: "L3",
          reviewedAt: null,
          mediaUrl: null,
          attribution: {
            creatorName: "Jane",
            sourceUrl: "https://example.com/s",
            licenseType: "EXPLICIT_PERMISSION",
            consentDate: "2026-01-15T00:00:00.000Z",
          },
          claimantContact: "private@example.com",
          contentBlob: "raw",
        },
      ],
    });
    expect(PortfolioDetailSchema.safeParse(leak).success).toBe(false);
  });
});
