// Accepted-detail service tests (plan portfolio-detail-page T5).
// getAcceptedDetail() guards + provenance enrichment with in-memory fakes.
// Proves: eligible records enrich safely; hidden records return null; no
// private/raw fields ever leave the service; superseding attribution wins.

import { describe, it, expect } from "vitest";

import { CurationServiceImpl } from "@/domain/curation/curation-service";
import type {
  AuditRepository,
  GalleryRepository,
} from "@/domain/curation/ports";
import type {
  AuditEntry,
  GalleryDetailRecord,
} from "@/domain/curation/types";
import type {
  AiProvenanceRecord,
  CreatorRecord,
  RemovalRecord,
  SourceRecord,
  SupersedingAssertion,
} from "@/domain/provenance/types";
import type { ProvenanceRepository, ProvenanceRebuildQueue } from "@/domain/provenance/ports";
import { PortfolioDetailSchema } from "@/domain/curation/detail-schemas";

const TS = "2026-06-01T12:00:00.000Z";

function baseDetail(id: string, overrides: Partial<GalleryDetailRecord> = {}): GalleryDetailRecord {
  return {
    id,
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
    consentRevokedAt: null,
    reviewedAt: TS,
    duplicateOfId: null,
    mediaUrl: "https://cdn.example.com/card.webp",
    stackTags: ["React", "Tailwind"],
    desktopMediaUrl: "https://cdn.example.com/desktop.webp",
    mobileMediaUrl: null,
    pageIndex: ["Home", "Work"],
    sections: null,
    strengths: null,
    stackEvidence: null,
    sourceRecordId: "source-1",
    aiProvenanceId: "ai-1",
    ...overrides,
  };
}

function makeHarness(detail: GalleryDetailRecord | null, opts: {
  removal?: RemovalRecord | null;
  source?: SourceRecord | null;
  creator?: CreatorRecord | null;
  ai?: AiProvenanceRecord | null;
  assertion?: SupersedingAssertion | null;
} = {}) {
  const galleryRepo: GalleryRepository = {
    ingest: async () => {
      throw new Error("not used");
    },
    findById: async () => null,
    findSummaryById: async () => null,
    findDetailById: async () => detail,
    update: async () => {
      throw new Error("not used");
    },
    updateStatus: async () => {
      throw new Error("not used");
    },
    flagDuplicate: async () => {
      throw new Error("not used");
    },
    archive: async () => {
      throw new Error("not used");
    },
    suspend: async () => {
      throw new Error("not used");
    },
    listAccepted: async () => [],
  };

  const provenanceRepo: ProvenanceRepository = {
    createCreator: async () => {
      throw new Error("not used");
    },
    findCreatorById: async (creatorId) => opts.creator?.id === creatorId ? opts.creator : null,
    createSourceRecord: async () => {
      throw new Error("not used");
    },
    findSourceRecordByCanonicalUrl: async () => null,
    findSourceRecordById: async (id) => opts.source?.id === id ? opts.source : null,
    createAiProvenance: async () => {
      throw new Error("not used");
    },
    findAiProvenanceById: async (id) => opts.ai?.id === id ? opts.ai : null,
    fileClaim: async () => {
      throw new Error("not used");
    },
    findClaimById: async () => null,
    resolveClaim: async () => {
      throw new Error("not used");
    },
    requestRemoval: async () => {
      throw new Error("not used");
    },
    findRemovalById: async () => null,
    findActiveRemovalByItemId: async () => opts.removal ?? null,
    markRemovalEffective: async () => {
      throw new Error("not used");
    },
    markRemovalCompleted: async () => {
      throw new Error("not used");
    },
    recordSupersedingAssertion: async () => {
      throw new Error("not used");
    },
    findLatestAssertionForItem: async () => opts.assertion ?? null,
    findPatternSignalsReferencingItem: async () => [],
    markSignalStale: async () => {
      throw new Error("not used");
    },
    getSignalEligibility: async () => null,
    setSignalRebuildState: async () => {
      throw new Error("not used");
    },
    revokeConsentForItem: async () => ({ revokedAt: TS }),
  };

  const auditRepo: AuditRepository = {
    create: async (): Promise<AuditEntry> => {
      throw new Error("not used");
    },
    findByItemId: async () => [],
  };

  const rebuildQueue: ProvenanceRebuildQueue = {
    enqueueRebuild: async () => {},
  };

  const service = new CurationServiceImpl(galleryRepo, auditRepo, provenanceRepo, rebuildQueue);
  return service;
}

describe("CurationServiceImpl.getAcceptedDetail", () => {
  it("returns an enriched safe detail for an eligible record", async () => {
    const service = makeHarness(baseDetail("item-123"), {
      source: {
        id: "source-1",
        sourceUrl: "https://jane-doe.com/portfolio",
        canonicalUrl: "https://jane-doe.com/portfolio",
        captureMode: "MANUAL_SUBMISSION",
        capturedAt: "2026-01-15T00:00:00.000Z",
        evidenceHash: null,
        creatorId: "creator-1",
        createdAt: TS,
      },
      creator: {
        id: "creator-1",
        name: "Jane Doe",
        url: null,
        verificationStatus: "UNVERIFIED",
        createdAt: TS,
      },
      ai: {
        id: "ai-1",
        provider: "openai",
        modelName: "gpt-4o",
        generatedAt: TS,
        disclosureStatus: "AI_ASSISTED",
        promptHash: "abc",
        outputHash: "def",
        createdAt: TS,
      },
    });

    const detail = await service.getAcceptedDetail("item-123");
    expect(detail).not.toBeNull();

    const parsed = PortfolioDetailSchema.safeParse(detail);
    expect(parsed.success, JSON.stringify(parsed.success ? "" : parsed.error.issues)).toBe(true);

    expect(detail!.provenance?.hasSourceRecord).toBe(true);
    expect(detail!.provenance?.hasCreator).toBe(true);
    expect(detail!.provenance?.hasAiProvenance).toBe(true);
    expect(detail!.provenance?.creator?.name).toBe("Jane Doe");
    expect(detail!.provenance?.source?.capturedAt).toBe("2026-01-15T00:00:00.000Z");
    expect(detail!.provenance?.aiDisclosure).toBe("AI_ASSISTED");
    expect(detail!.captureFreshness.capturedAt).toBe("2026-01-15T00:00:00.000Z");
    // No private/raw fields leak into the DTO.
    const asRecord = detail as unknown as Record<string, unknown>;
    expect(asRecord).not.toHaveProperty("claimantContact");
    expect(asRecord).not.toHaveProperty("contentBlob");
    expect(asRecord).not.toHaveProperty("structureJSON");
    expect(asRecord).not.toHaveProperty("evidenceHash");
    expect(asRecord).not.toHaveProperty("promptHash");
    expect(asRecord).not.toHaveProperty("outputHash");
  });

  it("returns null for every hidden state", async () => {
    const cases: Partial<GalleryDetailRecord>[] = [
      { status: "PENDING_REVIEW" },
      { status: "REJECTED" },
      { status: "ARCHIVED" },
      { status: "SUSPENDED" },
      { complianceStatus: "FLAG" },
      { consentRevokedAt: "2026-05-01T00:00:00.000Z" },
    ];
    for (const overrides of cases) {
      const service = makeHarness(baseDetail("item-x", overrides));
      expect(await service.getAcceptedDetail("item-x"), JSON.stringify(overrides)).toBeNull();
    }
  });

  it("returns null for unknown ids and active removals", async () => {
    const missing = makeHarness(null);
    expect(await missing.getAcceptedDetail("item-missing")).toBeNull();

    const removed = makeHarness(baseDetail("item-123"), {
      removal: {
        id: "removal-1",
        itemId: "item-123",
        status: "EFFECTIVE",
        requestedBy: "someone",
        reason: "requested removal",
        requestedAt: TS,
        effectiveAt: TS,
        completedAt: null,
        createdAt: TS,
      },
    });
    expect(await removed.getAcceptedDetail("item-123")).toBeNull();
  });

  it("applies superseding attribution for display without mutating history", async () => {
    const service = makeHarness(baseDetail("item-123"), {
      assertion: {
        id: "assert-1",
        targetItemId: "item-123",
        replacesAssertionId: "assert-0",
        correctedCreatorId: "creator-2",
        correctedLicenseType: "CC_BY",
        rationale: "correction",
        recordedBy: "reviewer",
        recordedAt: TS,
      },
      creator: {
        id: "creator-2",
        name: "Corrected Creator",
        url: null,
        verificationStatus: "VERIFIED",
        createdAt: TS,
      },
    });

    const detail = await service.getAcceptedDetail("item-123");
    expect(detail).not.toBeNull();
    // Display attribution reflects the correction (R3-compliant: history immutable).
    expect(detail!.provenance?.creator?.name).toBe("Corrected Creator");
    expect(detail!.provenance?.licence?.id).toBe("CC_BY");
    // Historical attribution is untouched.
    expect(detail!.attribution.creatorName).toBe("Jane Doe");
  });

  it("derives effective permission from licence x consent (ND => DISPLAY_ONLY)", async () => {
    const service = makeHarness(
      baseDetail("item-123", { attribution: { ...baseDetail("x").attribution, licenseType: "CC_BY" }, consentTier: "FULL" }),
    );
    const detail = await service.getAcceptedDetail("item-123");
    expect(detail).not.toBeNull();
    expect(detail!.provenance?.licence?.effectivePermission).toBe("FULL");
  });
});
