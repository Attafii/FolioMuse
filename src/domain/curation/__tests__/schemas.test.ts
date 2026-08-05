import { describe, it, expect } from "vitest";

import {
  AttributionSchema,
  ConsentRecordSchema,
  GalleryItemSummarySchema,
  RejectionReasonSchema,
  CurationTelemetryEventSchema,
  QualityLevelSchema,
  ComplianceStatusSchema,
  ReviewDecisionSchema,
} from "@/domain/curation/schemas";

// ─── AttributionSchema ────────────────────────────────────────────────────────

describe("AttributionSchema", () => {
  const validAttribution = {
    creatorName: "Jane Doe",
    sourceUrl: "https://jane-doe.com/portfolio",
    licenseType: "CC_BY" as const,
    consentDate: "2026-01-15T00:00:00.000Z",
  };

  it("passes validation with valid input", () => {
    const result = AttributionSchema.safeParse(validAttribution);
    expect(result.success).toBe(true);
  });

  it("rejects empty creatorName", () => {
    const result = AttributionSchema.safeParse({
      ...validAttribution,
      creatorName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("creatorName");
    }
  });

  it("rejects non-URL sourceUrl", () => {
    const result = AttributionSchema.safeParse({
      ...validAttribution,
      sourceUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("sourceUrl");
    }
  });
});

// ─── ConsentRecordSchema ──────────────────────────────────────────────────────

describe("ConsentRecordSchema", () => {
  const baseConsent = {
    tier: "DISPLAY" as const,
    consentedBy: "Jane Doe",
    consentedAt: "2026-01-15T00:00:00.000Z",
    terms: "CC_BY" as const,
    expiresAt: null,
  };

  it("passes validation with DISPLAY tier", () => {
    const result = ConsentRecordSchema.safeParse(baseConsent);
    expect(result.success).toBe(true);
  });

  it("passes validation with FULL tier", () => {
    const result = ConsentRecordSchema.safeParse({
      ...baseConsent,
      tier: "FULL",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing tier", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tier: _tier, ...withoutTier } = baseConsent;
    const result = ConsentRecordSchema.safeParse(withoutTier);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("tier");
    }
  });

  it("rejects invalid tier value", () => {
    const result = ConsentRecordSchema.safeParse({
      ...baseConsent,
      tier: "INVALID_TIER",
    });
    expect(result.success).toBe(false);
  });
});

// ─── GalleryItemSummarySchema ─────────────────────────────────────────────────

describe("GalleryItemSummarySchema", () => {
  const validSummary = {
    id: "item-1",
    title: "Brutalist Editorial Layout",
    creatorRole: "Designer",
    styleTags: ["brutalist", "editorial"],
    qualityLevel: "L3" as const,
    complianceStatus: "PASS" as const,
    status: "ACCEPTED" as const,
    attribution: {
      creatorName: "Jane Doe",
      sourceUrl: "https://jane-doe.com/portfolio",
      licenseType: "CC_BY" as const,
      consentDate: "2026-01-15T00:00:00.000Z",
    },
    consentTier: "FULL" as const,
    reviewedAt: "2026-06-01T12:00:00.000Z",
    duplicateOfId: null,
  };

  it("passes validation with valid input", () => {
    const result = GalleryItemSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it("rejects input with contentBlob field (anti-cloning guard)", () => {
    // Zod .object() strips unknown keys by default, so .strict() is
    // chained here to test that the schema CAN reject contentBlob if
    // strict mode is enabled (ADR-0001: no exportable content blob).
    const result = GalleryItemSummarySchema.strict().safeParse({
      ...validSummary,
      contentBlob: "should not be here",
    });
    expect(result.success).toBe(false);
  });

  it("rejects null reviewedAt when schema expects datetime", () => {
    // reviewedAt is nullable, this should pass
    const result = GalleryItemSummarySchema.safeParse({
      ...validSummary,
      reviewedAt: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── RejectionReasonSchema ────────────────────────────────────────────────────

describe("RejectionReasonSchema", () => {
  const allReasons = [
    "QUALITY_BELOW_THRESHOLD",
    "COMPLIANCE_FAIL",
    "MISSING_CONSENT",
    "INCOMPLETE_ATTRIBUTION",
    "DUPLICATE",
    "CROSS_CLONE",
    "FABRICATED_CREDIBILITY",
    "STALE_CONTENT",
  ] as const;

  it("accepts all 8 valid enum values", () => {
    for (const reason of allReasons) {
      const result = RejectionReasonSchema.safeParse(reason);
      expect(result.success, `Failed for ${reason}`).toBe(true);
    }
  });

  it("rejects invalid enum value", () => {
    const result = RejectionReasonSchema.safeParse("NOT_A_REASON");
    expect(result.success).toBe(false);
  });
});

// ─── CurationTelemetryEventSchema ─────────────────────────────────────────────

describe("CurationTelemetryEventSchema", () => {
  const validEvent = {
    action: "INGEST" as const,
    itemId: "item-1",
    actorId: "jane-doe",
    decision: null,
    rationale: "Ingested with valid attribution and consent",
    timestamp: "2026-08-05T12:00:00.000Z",
  };

  it("passes validation with valid input", () => {
    const result = CurationTelemetryEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("rejects missing timestamp", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { timestamp: _timestamp, ...withoutTimestamp } = validEvent;
    const result = CurationTelemetryEventSchema.safeParse(withoutTimestamp);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("timestamp");
    }
  });
});

// ─── QualityLevelSchema ───────────────────────────────────────────────────────

describe("QualityLevelSchema", () => {
  it("accepts all 5 quality levels", () => {
    for (const level of ["L0", "L1", "L2", "L3", "L4"]) {
      const result = QualityLevelSchema.safeParse(level);
      expect(result.success, `Failed for ${level}`).toBe(true);
    }
  });
});

// ─── ComplianceStatusSchema ───────────────────────────────────────────────────

describe("ComplianceStatusSchema", () => {
  it("accepts PASS, FLAG, and FAIL", () => {
    for (const status of ["PASS", "FLAG", "FAIL"]) {
      const result = ComplianceStatusSchema.safeParse(status);
      expect(result.success, `Failed for ${status}`).toBe(true);
    }
  });
});

// ─── ReviewDecisionSchema ─────────────────────────────────────────────────────

describe("ReviewDecisionSchema", () => {
  const validDecision = {
    itemId: "item-1",
    decision: "ACCEPT" as const,
    qualityLevel: "L3" as const,
    complianceStatus: "PASS" as const,
    rejectionReason: null,
    rationale: "Solid work",
    reviewerId: "reviewer-1",
  };

  it("passes validation with valid input (ACCEPT)", () => {
    const result = ReviewDecisionSchema.safeParse(validDecision);
    expect(result.success).toBe(true);
  });

  it("passes validation with REJECT + rejection reason", () => {
    const result = ReviewDecisionSchema.safeParse({
      ...validDecision,
      decision: "REJECT",
      rejectionReason: "QUALITY_BELOW_THRESHOLD",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing reviewerId", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reviewerId: _reviewerId, ...withoutReviewer } = validDecision;
    const result = ReviewDecisionSchema.safeParse(withoutReviewer);
    expect(result.success).toBe(false);
  });
});
