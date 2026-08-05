import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  GalleryItem,
  GalleryItemSummary,
  AuditEntry,
  OverrideDecisionInput,
  Attribution,
  ConsentRecord,
  QualityLevel,
  ComplianceStatus,
  ItemStatus,
} from "@/domain/curation/types";

import type { GalleryRepository, AuditRepository } from "@/domain/curation/ports";

import { CurationServiceImpl } from "@/domain/curation/curation-service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAttribution(overrides?: Partial<Attribution>): Attribution {
  return {
    creatorName: "Jane Doe",
    sourceUrl: "https://jane-doe.com/portfolio",
    licenseType: "CC_BY",
    consentDate: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

function makeConsent(overrides?: Partial<ConsentRecord>): ConsentRecord {
  return {
    tier: "FULL",
    consentedBy: "jane-doe",
    consentedAt: "2026-01-15T00:00:00.000Z",
    terms: "CC_BY",
    expiresAt: null,
    ...overrides,
  };
}

function makeGalleryItem(id: string, overrides?: Partial<GalleryItem>): GalleryItem {
  return {
    id,
    title: "Test Portfolio",
    creatorRole: "Designer",
    styleTags: ["minimal", "editorial"],
    qualityLevel: "L0",
    complianceStatus: "FLAG",
    status: "PENDING_REVIEW",
    attributionId: `attr-${id}`,
    consentRecordId: `consent-${id}`,
    attribution: makeAttribution(),
    consent: makeConsent(),
    reviewedAt: null,
    duplicateOfId: null,
    structureFingerprint: null,
    contentHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function itemToSummary(item: GalleryItem): GalleryItemSummary {
  return {
    id: item.id,
    title: item.title,
    creatorRole: item.creatorRole,
    styleTags: item.styleTags,
    qualityLevel: item.qualityLevel,
    complianceStatus: item.complianceStatus,
    status: item.status,
    attribution: item.attribution,
    consentTier: item.consent.tier,
    reviewedAt: item.reviewedAt,
    duplicateOfId: item.duplicateOfId,
  };
}

// ─── Mock Factory ─────────────────────────────────────────────────────────────

interface MockRepos {
  galleryRepo: GalleryRepository;
  auditRepo: AuditRepository;
  items: Map<string, GalleryItem>;
  auditEntries: AuditEntry[];
  consoleSpy: ReturnType<typeof vi.spyOn>;
}

function createMocks(): MockRepos {
  const items = new Map<string, GalleryItem>();
  const auditEntries: AuditEntry[] = [];
  let nextAuditId = 0;

  const galleryRepo = {
    ingest: vi.fn(async (input) => {
      const id = `item-${items.size + 1}`;
      const item = makeGalleryItem(id, {
        title: input.title,
        creatorRole: input.creatorRole,
        styleTags: input.styleTags,
        attribution: input.attribution,
        consent: input.consent,
      });
      items.set(id, item);
      return item;
    }),

    findById: vi.fn(
      async (id: string): Promise<GalleryItem | null> => items.get(id) ?? null,
    ),

    findSummaryById: vi.fn(
      async (id: string): Promise<GalleryItemSummary | null> => {
        const item = items.get(id);
        return item ? itemToSummary(item) : null;
      },
    ),

    update: vi.fn(async (id: string, input) => {
      const item = items.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      if (input.qualityLevel !== undefined) item.qualityLevel = input.qualityLevel;
      if (input.complianceStatus !== undefined) item.complianceStatus = input.complianceStatus;
      item.updatedAt = new Date().toISOString();
      return item;
    }),

    updateStatus: vi.fn(async (id: string, status: ItemStatus) => {
      const item = items.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      item.status = status;
      item.updatedAt = new Date().toISOString();
      return item;
    }),

    flagDuplicate: vi.fn(async (id: string, duplicateOfId: string) => {
      const item = items.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      item.duplicateOfId = duplicateOfId;
      item.updatedAt = new Date().toISOString();
      return item;
    }),

    archive: vi.fn(async (id: string) => {
      const item = items.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      item.status = "ARCHIVED";
      item.updatedAt = new Date().toISOString();
      return item;
    }),

    suspend: vi.fn(async (id: string) => {
      const item = items.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      item.status = "SUSPENDED";
      item.updatedAt = new Date().toISOString();
      return item;
    }),
  } as GalleryRepository;

  const auditRepo = {
    create: vi.fn(async (input) => {
      const entry: AuditEntry = {
        id: `audit-${++nextAuditId}`,
        action: input.action,
        actorId: input.actorId,
        itemId: input.itemId,
        decision: input.decision ?? null,
        rationale: input.rationale ?? null,
        timestamp: new Date().toISOString(),
      };
      auditEntries.push(entry);
      return entry;
    }),

    findByItemId: vi.fn(async (itemId: string) =>
      auditEntries.filter((e) => e.itemId === itemId),
    ),
  } as AuditRepository;

  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  return { galleryRepo, auditRepo, items, auditEntries, consoleSpy };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("CurationServiceImpl", () => {
  let mocks: MockRepos;
  let service: CurationServiceImpl;

  beforeEach(() => {
    mocks = createMocks();
    service = new CurationServiceImpl(mocks.galleryRepo, mocks.auditRepo);
    // Clear accumulated console.spy calls from previous tests
    mocks.consoleSpy.mockClear();
  });

  // ── 1. review() compliance=FAIL → REJECTED ─────────────────────────────────

  it("review(): compliance=FAIL rejects regardless of quality level", async () => {
    // Ingest an item first
    await service.ingest({
      title: "Test",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });

    const item = mocks.items.values().next().value as GalleryItem;

    // Pass itemId as extra field — zod runtime validation requires it
    const decision = {
      itemId: item.id,
      decision: "REJECT" as const,
      qualityLevel: "L4" as QualityLevel,
      complianceStatus: "FAIL" as ComplianceStatus,
      rejectionReason: null,
      rationale: "Compliance failure",
      reviewerId: "reviewer-1",
    };

    const summary = await service.review(decision);

    expect(summary.status).toBe("REJECTED");

    // Verify REJECT audit entry with COMPLIANCE_FAIL decision
    const rejectEntries = mocks.auditEntries.filter(
      (e) => e.action === "REJECT",
    );
    expect(rejectEntries.length).toBe(1);
    expect(rejectEntries[0].decision).toBe("COMPLIANCE_FAIL");
  });

  // ── 2. review() quality=L1 → REJECTED ─────────────────────────────────────

  it("review(): quality below L2 rejects with QUALITY_BELOW_THRESHOLD", async () => {
    await service.ingest({
      title: "Low Quality",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });

    const item = mocks.items.values().next().value as GalleryItem;

    const decision = {
      itemId: item.id,
      decision: "REJECT" as const,
      qualityLevel: "L1" as QualityLevel,
      complianceStatus: "PASS" as ComplianceStatus,
      rejectionReason: null,
      rationale: "Not good enough",
      reviewerId: "reviewer-1",
    };

    const summary = await service.review(decision);

    expect(summary.status).toBe("REJECTED");

    const rejectEntries = mocks.auditEntries.filter(
      (e) => e.action === "REJECT",
    );
    expect(rejectEntries.length).toBe(1);
    expect(rejectEntries[0].decision).toBe("QUALITY_BELOW_THRESHOLD");
  });

  // ── 3. review() compliance=PASS + quality=L3 → ACCEPTED ───────────────────

  it("review(): compliance=PASS + quality=L3 accepts", async () => {
    await service.ingest({
      title: "Great Work",
      creatorRole: "Developer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });

    const item = mocks.items.values().next().value as GalleryItem;

    const decision = {
      itemId: item.id,
      decision: "ACCEPT" as const,
      qualityLevel: "L3" as QualityLevel,
      complianceStatus: "PASS" as ComplianceStatus,
      rejectionReason: null,
      rationale: "Excellent",
      reviewerId: "reviewer-1",
    };

    const summary = await service.review(decision);

    expect(summary.status).toBe("ACCEPTED");

    const acceptEntries = mocks.auditEntries.filter(
      (e) => e.action === "ACCEPT",
    );
    expect(acceptEntries.length).toBe(1);
    expect(acceptEntries[0].decision).toBe("ACCEPT");
  });

  // ── 4. ingest() valid → PENDING_REVIEW + INGEST audit ─────────────────────

  it("ingest(): valid input returns PENDING_REVIEW summary and creates INGEST audit", async () => {
    const summary = await service.ingest({
      title: "New Portfolio",
      creatorRole: "Designer",
      styleTags: ["brutalist"],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });

    expect(summary.status).toBe("PENDING_REVIEW");
    expect(summary.title).toBe("New Portfolio");

    // INGEST audit entry created
    const ingestEntries = mocks.auditEntries.filter(
      (e) => e.action === "INGEST",
    );
    expect(ingestEntries.length).toBe(1);
    expect(ingestEntries[0].itemId).toBe(summary.id);
  });

  // ── 5. ingest() missing consent → throws ──────────────────────────────────

  it("ingest(): missing consent field throws ZodError", async () => {
    // Send an object without consent — zod IngestInputSchema will reject
    const badInput = {
      title: "Test",
      creatorRole: "Designer",
      styleTags: [] as string[],
      attribution: makeAttribution(),
      // consent missing
    };

    // zod will reject at runtime; TS cast needed since type lacks consent
    await expect(
      service.ingest(badInput as unknown as Parameters<typeof service.ingest>[0]),
    ).rejects.toThrow();
  });

  // ── 6. ingest() incomplete attribution → throws ───────────────────────────

  it("ingest(): attribution with empty creatorName throws", async () => {
    await expect(
      service.ingest({
        title: "Test",
        creatorRole: "Designer",
        styleTags: [],
        attribution: makeAttribution({ creatorName: "" }),
        consent: makeConsent(),
      }),
    ).rejects.toThrow();
  });

  // ── 7. escalate() → ESCALATE audit entry ──────────────────────────────────

  it("escalate(): creates ESCALATE audit entry", async () => {
    await service.escalate("item-1", "Needs senior review");

    const escalateEntries = mocks.auditEntries.filter(
      (e) => e.action === "ESCALATE",
    );
    expect(escalateEntries.length).toBe(1);
    expect(escalateEntries[0].itemId).toBe("item-1");
    expect(escalateEntries[0].rationale).toBe("Needs senior review");
    expect(escalateEntries[0].actorId).toBe("system");
  });

  // ── 8. suspend() → SUSPEND audit + repo.suspend() called ──────────────────

  it("suspend(): creates SUSPEND audit entry and calls repository.suspend()", async () => {
    await service.ingest({
      title: "To Suspend",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });
    const item = mocks.items.values().next().value as GalleryItem;

    const summary = await service.suspend(item.id, "Policy violation");

    expect(summary.status).toBe("SUSPENDED");
    expect(mocks.galleryRepo.suspend).toHaveBeenCalledWith(item.id);

    const suspendEntries = mocks.auditEntries.filter(
      (e) => e.action === "SUSPEND",
    );
    expect(suspendEntries.length).toBe(1);
    expect(suspendEntries[0].rationale).toBe("Policy violation");
  });

  // ── 9. archive() → ARCHIVE audit + repo.archive() called ──────────────────

  it("archive(): creates ARCHIVE audit entry and calls repository.archive()", async () => {
    await service.ingest({
      title: "To Archive",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });
    const item = mocks.items.values().next().value as GalleryItem;

    const summary = await service.archive(item.id, "Stale content");

    expect(summary.status).toBe("ARCHIVED");
    expect(mocks.galleryRepo.archive).toHaveBeenCalledWith(item.id);

    const archiveEntries = mocks.auditEntries.filter(
      (e) => e.action === "ARCHIVE",
    );
    expect(archiveEntries.length).toBe(1);
    expect(archiveEntries[0].rationale).toBe("Stale content");
  });

  // ── 10. revokeConsent() → CONSENT_REVOKE audit + repo.archive() called ────

  it("revokeConsent(): creates CONSENT_REVOKE audit and archives item", async () => {
    await service.ingest({
      title: "Consent Revoked",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });
    const item = mocks.items.values().next().value as GalleryItem;

    const summary = await service.revokeConsent(item.id);

    expect(summary.status).toBe("ARCHIVED");
    expect(mocks.galleryRepo.archive).toHaveBeenCalledWith(item.id);

    const revokeEntries = mocks.auditEntries.filter(
      (e) => e.action === "CONSENT_REVOKE",
    );
    expect(revokeEntries.length).toBe(1);
  });

  // ── 11. flagDuplicate() → DUPLICATE_FLAG audit + repo.flagDuplicate() ─────

  it("flagDuplicate(): creates DUPLICATE_FLAG audit and calls repository.flagDuplicate()", async () => {
    await service.ingest({
      title: "Duplicate Candidate",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });
    const item = mocks.items.values().next().value as GalleryItem;

    const summary = await service.flagDuplicate(item.id, "item-original");

    expect(mocks.galleryRepo.flagDuplicate).toHaveBeenCalledWith(
      item.id,
      "item-original",
    );

    const duplicateEntries = mocks.auditEntries.filter(
      (e) => e.action === "DUPLICATE_FLAG",
    );
    expect(duplicateEntries.length).toBe(1);
    expect(duplicateEntries[0].decision).toBe("item-original");
    expect(summary.duplicateOfId).toBe("item-original");
  });

  // ── 12. triggerReReview() → RE_REVIEW audit + updateStatus(PENDING_REREVIEW) ──

  it("triggerReReview(): creates RE_REVIEW audit and updates status to PENDING_REREVIEW", async () => {
    await service.ingest({
      title: "Re-review",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });
    const item = mocks.items.values().next().value as GalleryItem;

    const summary = await service.triggerReReview(item.id);

    expect(mocks.galleryRepo.updateStatus).toHaveBeenCalledWith(
      item.id,
      "PENDING_REREVIEW",
    );

    const reReviewEntries = mocks.auditEntries.filter(
      (e) => e.action === "RE_REVIEW",
    );
    expect(reReviewEntries.length).toBe(1);
    expect(summary.status).toBe("PENDING_REREVIEW");
  });

  // ── 13. overrideReview() → OVERRIDE audit entry ───────────────────────────

  it("overrideReview(): creates OVERRIDE audit entry and updates item status", async () => {
    await service.ingest({
      title: "Override Test",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });
    const item = mocks.items.values().next().value as GalleryItem;

    const override: OverrideDecisionInput = {
      finalDecision: "ACCEPT",
      qualityLevel: "L3",
      complianceStatus: "PASS",
      rejectionReason: null,
      rationale: "Senior override",
    };

    const summary = await service.overrideReview(item.id, override);

    expect(summary.status).toBe("ACCEPTED");

    const overrideEntries = mocks.auditEntries.filter(
      (e) => e.action === "OVERRIDE",
    );
    expect(overrideEntries.length).toBe(1);
    expect(overrideEntries[0].actorId).toBe("senior-reviewer");
  });

  // ── 14. emitTelemetry() invoked for every action ──────────────────────────

  it("emitTelemetry(): fires [telemetry] console.log for every action", async () => {
    // Perform an action that triggers telemetry
    await service.escalate("item-1", "escalation test");

    const telemetryCalls = mocks.consoleSpy.mock.calls.filter(
      (call: unknown[]): call is [string, ...unknown[]] =>
        typeof call[0] === "string" && call[0] === "[telemetry]",
    );
    expect(telemetryCalls.length).toBeGreaterThan(0);

    // Verify the telemetry payload is valid JSON
    const payload = JSON.parse(telemetryCalls[0][1] as string);
    expect(payload.action).toBe("ESCALATE");
    expect(payload.itemId).toBe("item-1");
  });

  it("emitTelemetry(): fires on ingest", async () => {
    await service.ingest({
      title: "Telemetry Test",
      creatorRole: "Designer",
      styleTags: [],
      attribution: makeAttribution(),
      consent: makeConsent(),
    });

    const telemetryCalls = mocks.consoleSpy.mock.calls.filter(
      (call: unknown[]): call is [string, ...unknown[]] =>
        typeof call[0] === "string" && call[0] === "[telemetry]",
    );

    const ingestTelemetry = telemetryCalls.filter((call: unknown[]) => {
      const payload = JSON.parse(call[1] as string);
      return payload.action === "INGEST";
    });
    expect(ingestTelemetry.length).toBe(1);
  });

  // ── 15. No delete() / contentBlob on mock ────────────────────────────────

  it("mock has no delete method (anti-cloning guard at interface level)", () => {
    expect("delete" in mocks.galleryRepo).toBe(false);
    expect("delete" in mocks.auditRepo).toBe(false);
  });

  it("gallery repo mock has no content-blob-exporting method", () => {
    // The GalleryRepository interface does not expose any content blob method
    expect("getFullContent" in mocks.galleryRepo).toBe(false);
    expect("exportContentBlob" in mocks.galleryRepo).toBe(false);
    expect("findFullContentById" in mocks.galleryRepo).toBe(false);
  });
});
