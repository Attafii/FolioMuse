import { describe, it, expect } from "vitest";

import {
  CaptureModeSchema,
  DisclosureStatusSchema,
  LicenceIdSchema,
  PermissionResultSchema,
  ClaimStatusSchema,
  RemovalStatusSchema,
  RebuildStateSchema,
  SourceUrlSchema,
  NewSourceRecordInputSchema,
  NewAiProvenanceInputSchema,
  AiProvenanceRecordSchema,
  OwnershipClaimRecordSchema,
  RemovalRecordSchema,
  PatternSignalStateSchema,
  StructuralLessonSchema,
  ProvenanceTelemetryEventSchema,
  SupersedingAssertionSchema,
  SupersedeAttributionInputSchema,
  ConsentRevocationInputSchema,
  NewCreatorInputSchema,
  FileOwnershipClaimInputSchema,
  ResolveOwnershipClaimInputSchema,
  RequestRemovalInputSchema,
  derivePermissionResult,
  NoDerivativesLicences,
  NonCommercialLicences,
} from "@/domain/provenance/schemas";

// ─── Enum Schemas ────────────────────────────────────────────────────────

describe("enum schemas", () => {
  it("accepts all capture modes and rejects deferred ones", () => {
    for (const mode of ["MANUAL_SUBMISSION", "URL_SUBMISSION", "BROWSER_ASSIST"]) {
      expect(CaptureModeSchema.safeParse(mode).success).toBe(true);
    }
    // Deferred modes are NOT valid v1 (policy §2.1).
    expect(CaptureModeSchema.safeParse("CRAWLER").success).toBe(false);
    expect(CaptureModeSchema.safeParse("API_PARTNER").success).toBe(false);
  });

  it("accepts all disclosure statuses", () => {
    for (const s of ["HUMAN", "AI_ASSISTED", "AI_GENERATED", "UNKNOWN"]) {
      expect(DisclosureStatusSchema.safeParse(s).success).toBe(true);
    }
    expect(DisclosureStatusSchema.safeParse("AI_MAGIC").success).toBe(false);
  });

  it("accepts the full licence vocabulary", () => {
    const licences = [
      "CC_BY", "CC_BY_SA", "CC_BY_NC", "CC_BY_NC_SA",
      "CC_BY_ND", "CC_BY_NC_ND", "CC0", "PDM",
      "MIT", "Apache-2.0", "BSD-3-Clause", "UNLICENSED",
    ];
    for (const l of licences) {
      expect(LicenceIdSchema.safeParse(l).success).toBe(true);
    }
    expect(LicenceIdSchema.safeParse("MADE_UP_LICENCE").success).toBe(false);
  });

  it("exposes ND and NC licence sets", () => {
    expect(NoDerivativesLicences.has("CC_BY_ND")).toBe(true);
    expect(NoDerivativesLicences.has("CC_BY_NC_ND")).toBe(true);
    expect(NoDerivativesLicences.has("CC_BY")).toBe(false);
    expect(NonCommercialLicences.has("CC_BY_NC")).toBe(true);
    expect(NonCommercialLicences.has("CC_BY_NC_SA")).toBe(true);
    expect(NonCommercialLicences.has("CC_BY")).toBe(false);
  });

  it("accepts all claim/removal/rebuild states", () => {
    for (const s of ["PENDING", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"]) {
      expect(ClaimStatusSchema.safeParse(s).success).toBe(true);
    }
    expect(ClaimStatusSchema.safeParse("AUTO_ACCEPTED").success).toBe(false);
    for (const s of ["REQUESTED", "EFFECTIVE", "COMPLETED"]) {
      expect(RemovalStatusSchema.safeParse(s).success).toBe(true);
    }
    for (const s of [
      "STALE_PENDING_REBUILD", "REBUILDING", "ACTIVE", "REBUILD_FAILED", "DROPPED_BELOW_FLOOR",
    ]) {
      expect(RebuildStateSchema.safeParse(s).success).toBe(true);
    }
    expect(PermissionResultSchema.safeParse("DISPLAY_ONLY").success).toBe(true);
  });
});

// ─── URL scheme restrictions (policy §2.3) ───────────────────────────────

describe("SourceUrlSchema", () => {
  it("accepts https URLs", () => {
    expect(SourceUrlSchema.safeParse("https://jane-doe.com/portfolio").success).toBe(true);
  });

  it("rejects non-http(s) schemes", () => {
    for (const bad of [
      "ftp://jane-doe.com/portfolio",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "data:text/plain,hello",
      "gopher://example.com",
    ]) {
      const r = SourceUrlSchema.safeParse(bad);
      expect(r.success).toBe(false);
    }
  });

  it("rejects embedded credentials", () => {
    const r = SourceUrlSchema.safeParse("https://user:pass@jane-doe.com/portfolio");
    expect(r.success).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(SourceUrlSchema.safeParse("not-a-url").success).toBe(false);
  });
});

// ─── New source record ───────────────────────────────────────────────────

describe("NewSourceRecordInputSchema", () => {
  const valid = {
    sourceUrl: "https://jane-doe.com/portfolio",
    canonicalUrl: "https://jane-doe.com/portfolio",
    captureMode: "MANUAL_SUBMISSION" as const,
    capturedAt: "2026-01-15T00:00:00.000Z",
  };

  it("passes with valid input", () => {
    expect(NewSourceRecordInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown keys (strict transport contract)", () => {
    const r = NewSourceRecordInputSchema.safeParse({
      ...valid,
      contentBlob: "raw-content",
      rawPrompt: "prompt-body",
    });
    expect(r.success).toBe(false);
  });

  it("rejects malformed evidence hash", () => {
    const r = NewSourceRecordInputSchema.safeParse({
      ...valid,
      evidenceHash: "not-a-hash",
    });
    expect(r.success).toBe(false);
  });

  it("accepts sha256-prefixed hash", () => {
    const r = NewSourceRecordInputSchema.safeParse({
      ...valid,
      evidenceHash: "sha256:" + "a".repeat(64),
    });
    expect(r.success).toBe(true);
  });
});

// ─── AI provenance ───────────────────────────────────────────────────────

describe("AiProvenance schemas", () => {
  const validNew = {
    provider: "openai",
    modelName: "gpt-4o",
    generatedAt: "2026-01-15T00:00:00.000Z",
    disclosureStatus: "AI_GENERATED" as const,
  };

  it("passes with valid input", () => {
    expect(NewAiProvenanceInputSchema.safeParse(validNew).success).toBe(true);
  });

  it("rejects missing AI disclosure (policy §6.1)", () => {
    const r = NewAiProvenanceInputSchema.safeParse({
      provider: "openai",
      modelName: "gpt-4o",
      generatedAt: "2026-01-15T00:00:00.000Z",
      // disclosureStatus omitted entirely
    });
    expect(r.success).toBe(false);
  });

  it("rejects UNKNOWN disclosure for new records", () => {
    const r = NewAiProvenanceInputSchema.safeParse({
      ...validNew,
      disclosureStatus: "UNKNOWN",
    });
    expect(r.success).toBe(false);
  });

  it("rejects raw prompt bodies in favor of hashes", () => {
    // promptHash only accepts hashes; a raw prompt body is not a hash
    const r = NewAiProvenanceInputSchema.safeParse({
      ...validNew,
      promptHash: "write a hero section about my work",
    });
    expect(r.success).toBe(false);
  });

  it("accepts record schema with UNKNOWN disclosure (historical records)", () => {
    const r = AiProvenanceRecordSchema.safeParse({
      id: "ai_1",
      provider: "openai",
      modelName: "gpt-4o",
      generatedAt: "2026-01-15T00:00:00.000Z",
      disclosureStatus: "UNKNOWN",
      promptHash: null,
      outputHash: null,
      createdAt: "2026-01-15T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });
});

// ─── Ownership claims (policy §8.1) ──────────────────────────────────────

describe("OwnershipClaimRecordSchema", () => {
  const base = {
    id: "claim_1",
    itemId: "item_1",
    claimantName: "Jane Doe",
    claimantContact: "jane@example.com",
    status: "PENDING" as const,
    submittedAt: "2026-01-15T00:00:00.000Z",
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
    creatorId: null,
    createdAt: "2026-01-15T00:00:00.000Z",
  };

  it("passes a PENDING claim without resolution metadata", () => {
    expect(OwnershipClaimRecordSchema.safeParse(base).success).toBe(true);
  });

  it("rejects ACCEPTED claim without resolution metadata (cross-field)", () => {
    const r = OwnershipClaimRecordSchema.safeParse({ ...base, status: "ACCEPTED" });
    expect(r.success).toBe(false);
  });

  it("passes ACCEPTED claim with resolution metadata", () => {
    const r = OwnershipClaimRecordSchema.safeParse({
      ...base,
      status: "ACCEPTED",
      resolvedAt: "2026-01-20T00:00:00.000Z",
      resolvedBy: "reviewer-1",
      resolution: "claim verified against public evidence",
    });
    expect(r.success).toBe(true);
  });

  it("passes WITHDRAWN without resolution metadata", () => {
    expect(OwnershipClaimRecordSchema.safeParse({ ...base, status: "WITHDRAWN" }).success).toBe(true);
  });

  it("rejects unknown keys (claimant private evidence stays out of public contracts)", () => {
    const r = OwnershipClaimRecordSchema.safeParse({ ...base, idProof: "passport-scan" });
    expect(r.success).toBe(false);
  });
});

describe("claim resolution input", () => {
  it("accepts valid resolution", () => {
    expect(
      ResolveOwnershipClaimInputSchema.safeParse({
        claimId: "claim_1",
        decision: "ACCEPTED",
        resolvedBy: "reviewer-1",
        resolution: "verified",
      }).success,
    ).toBe(true);
  });

  it("rejects a decision outside ACCEPTED/REJECTED", () => {
    expect(
      ResolveOwnershipClaimInputSchema.safeParse({
        claimId: "claim_1",
        decision: "MAYBE",
        resolvedBy: "reviewer-1",
        resolution: "x",
      }).success,
    ).toBe(false);
  });
});

// ─── Removal records (policy §8.2) ───────────────────────────────────────

describe("RemovalRecordSchema", () => {
  const base = {
    id: "rem_1",
    itemId: "item_1",
    status: "REQUESTED" as const,
    requestedBy: "reviewer-1",
    reason: "creator requested removal",
    requestedAt: "2026-01-15T00:00:00.000Z",
    effectiveAt: null,
    completedAt: null,
    createdAt: "2026-01-15T00:00:00.000Z",
  };

  it("passes REQUESTED without effectiveAt", () => {
    expect(RemovalRecordSchema.safeParse(base).success).toBe(true);
  });

  it("rejects EFFECTIVE without effectiveAt (cross-field)", () => {
    const r = RemovalRecordSchema.safeParse({ ...base, status: "EFFECTIVE" });
    expect(r.success).toBe(false);
  });

  it("passes EFFECTIVE with effectiveAt", () => {
    expect(
      RemovalRecordSchema.safeParse({
        ...base,
        status: "EFFECTIVE",
        effectiveAt: "2026-01-16T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects COMPLETED without completedAt (cross-field)", () => {
    const r = RemovalRecordSchema.safeParse({
      ...base,
      status: "COMPLETED",
      effectiveAt: "2026-01-16T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  it("rejects completedAt before effectiveAt (illegal transition)", () => {
    const r = RemovalRecordSchema.safeParse({
      ...base,
      status: "COMPLETED",
      effectiveAt: "2026-01-17T00:00:00.000Z",
      completedAt: "2026-01-16T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });
});

// ─── Pattern signals & structural lessons (policy §10.1, ADR-0003 D8) ────

describe("PatternSignalStateSchema", () => {
  const valid = {
    id: "sig_1",
    derivedFromItemIds: ["item_1", "item_2", "item_3"],
    patternType: "hero_layout",
    staleSince: null,
    eligibleItemCount: 3,
    distinctCreatorCount: 2,
    rebuildState: "ACTIVE" as const,
    createdAt: "2026-01-15T00:00:00.000Z",
  };

  it("passes a valid signal", () => {
    expect(PatternSignalStateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts rebuild state machine values", () => {
    for (const s of ["STALE_PENDING_REBUILD", "REBUILDING", "REBUILD_FAILED", "DROPPED_BELOW_FLOOR"]) {
      expect(PatternSignalStateSchema.safeParse({ ...valid, rebuildState: s }).success).toBe(true);
    }
  });
});

describe("StructuralLessonSchema", () => {
  const valid = {
    patternType: "hero_layout",
    sourceItemCount: 3,
    distinctCreatorCount: 2,
    sectionFrequency: { hero: 3, about: 2 },
    commonTags: ["minimal", "editorial"],
    averageSectionCount: 4.5,
  };

  it("passes a valid >=3-source aggregate lesson", () => {
    expect(StructuralLessonSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects under-floor lessons (item count < 3)", () => {
    const r = StructuralLessonSchema.safeParse({ ...valid, sourceItemCount: 2 });
    expect(r.success).toBe(false);
  });

  it("rejects under-floor lessons (creator count < 2)", () => {
    const r = StructuralLessonSchema.safeParse({ ...valid, distinctCreatorCount: 1 });
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric sectionFrequency values (aggregate stats only)", () => {
    const r = StructuralLessonSchema.safeParse({
      ...valid,
      sectionFrequency: { hero: "lots" },
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const r = StructuralLessonSchema.safeParse({ ...valid, fullItemContent: "x" });
    expect(r.success).toBe(false);
  });
});

// ─── Permission derivation (policy §5.2, ADR-0003 D3) ───────────────────

describe("derivePermissionResult", () => {
  it("ND licences are DISPLAY_ONLY regardless of consent tier", () => {
    expect(derivePermissionResult("CC_BY_ND", "FULL")).toBe("DISPLAY_ONLY");
    expect(derivePermissionResult("CC_BY_ND", "PATTERN_DERIVE")).toBe("DISPLAY_ONLY");
    expect(derivePermissionResult("CC_BY_NC_ND", "PATTERN_DERIVE")).toBe("DISPLAY_ONLY");
  });

  it("NC licences are DISPLAY_ONLY until commercial posture decided", () => {
    expect(derivePermissionResult("CC_BY_NC", "PATTERN_DERIVE")).toBe("DISPLAY_ONLY");
    expect(derivePermissionResult("CC_BY_NC_SA", "FULL")).toBe("DISPLAY_ONLY");
  });

  it("DISPLAY consent yields DISPLAY_ONLY even for permissive licences", () => {
    expect(derivePermissionResult("CC_BY", "DISPLAY")).toBe("DISPLAY_ONLY");
    expect(derivePermissionResult("MIT", "DISPLAY")).toBe("DISPLAY_ONLY");
  });

  it("PATTERN_DERIVE consent on permissive licence yields PATTERN_DERIVE", () => {
    expect(derivePermissionResult("CC_BY", "PATTERN_DERIVE")).toBe("PATTERN_DERIVE");
    expect(derivePermissionResult("CC0", "PATTERN_DERIVE")).toBe("PATTERN_DERIVE");
  });

  it("FULL consent on permissive licence yields FULL", () => {
    expect(derivePermissionResult("CC_BY", "FULL")).toBe("FULL");
    expect(derivePermissionResult("MIT", "FULL")).toBe("FULL");
  });
});

// ─── Telemetry (policy §12) ──────────────────────────────────────────────

describe("ProvenanceTelemetryEventSchema", () => {
  const ts = "2026-01-15T00:00:00.000Z";

  it("accepts REBUILD_BELOW_FLOOR with counts", () => {
    expect(
      ProvenanceTelemetryEventSchema.safeParse({
        type: "REBUILD_BELOW_FLOOR",
        signalId: "sig_1",
        itemCount: 2,
        creatorCount: 1,
        timestamp: ts,
      }).success,
    ).toBe(true);
  });

  it("rejects events carrying raw content", () => {
    const r = ProvenanceTelemetryEventSchema.safeParse({
      type: "PROHIBITED_EXPORT_ATTEMPT",
      reason: "x",
      timestamp: ts,
      rawPrompt: "should never appear",
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown event types", () => {
    expect(
      ProvenanceTelemetryEventSchema.safeParse({
        type: "HACKED",
        timestamp: ts,
      }).success,
    ).toBe(false);
  });
});

// ─── Superseding assertions (policy §7.2) ────────────────────────────────

describe("SupersedeAttributionInputSchema", () => {
  const base = {
    targetItemId: "item_1",
    replacesAssertionId: "assertion_1",
    rationale: "creator corrected their display name",
    recordedBy: "reviewer-1",
  };

  it("passes when at least one field is corrected", () => {
    expect(
      SupersedeAttributionInputSchema.safeParse({
        ...base,
        correctedCreatorId: "creator_2",
      }).success,
    ).toBe(true);
    expect(
      SupersedeAttributionInputSchema.safeParse({
        ...base,
        correctedLicenseType: "CC_BY_SA",
      }).success,
    ).toBe(true);
  });

  it("rejects when nothing is corrected (pointless supersession)", () => {
    const r = SupersedeAttributionInputSchema.safeParse(base);
    expect(r.success).toBe(false);
  });

  it("validates the full assertion record", () => {
    expect(
      SupersedingAssertionSchema.safeParse({
        id: "assertion_2",
        targetItemId: "item_1",
        replacesAssertionId: "assertion_1",
        correctedCreatorId: "creator_2",
        correctedLicenseType: null,
        rationale: "creator corrected their display name",
        recordedBy: "reviewer-1",
        recordedAt: "2026-01-20T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});

// ─── Misc inputs ─────────────────────────────────────────────────────────

describe("misc input schemas", () => {
  it("NewCreatorInputSchema rejects empty names", () => {
    expect(NewCreatorInputSchema.safeParse({ name: "" }).success).toBe(false);
    expect(NewCreatorInputSchema.safeParse({ name: "Jane Doe" }).success).toBe(true);
  });

  it("FileOwnershipClaimInputSchema requires contact (private, internal only)", () => {
    expect(
      FileOwnershipClaimInputSchema.safeParse({
        itemId: "item_1",
        claimantName: "Jane Doe",
      }).success,
    ).toBe(false);
    expect(
      FileOwnershipClaimInputSchema.safeParse({
        itemId: "item_1",
        claimantName: "Jane Doe",
        claimantContact: "jane@example.com",
      }).success,
    ).toBe(true);
  });

  it("RequestRemovalInputSchema requires a reason", () => {
    expect(
      RequestRemovalInputSchema.safeParse({
        itemId: "item_1",
        requestedBy: "reviewer-1",
        reason: "",
      }).success,
    ).toBe(false);
  });

  it("ConsentRevocationInputSchema is strict", () => {
    expect(
      ConsentRevocationInputSchema.safeParse({
        itemId: "item_1",
        revokedBy: "reviewer-1",
      }).success,
    ).toBe(true);
  });
});
