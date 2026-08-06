// ─── Unit Tests for ProvenanceService ───────────────────────────────────────
// Pure domain tests — NO database, NO Prisma. The four ports are replaced by
// in-memory fakes so policy logic is exercised deterministically.
//
// Acceptance coverage (plan T10):
//   - valid human and AI-assisted artifacts
//   - absent attribution (INCOMPLETE_PROVENANCE, throw)
//   - incompatible licence (DISPLAY_ONLY intent vs PATTERN_DERIVE/FULL)
//   - structural lesson: exactly 3 items / 2 creators (passes)
//   - structural lesson: 3 items / 1 creator (fails — R2 floor)
//   - revoke reducing floor → DROPPED_BELOW_FLOOR (task-10-floor-edge)
//   - duplicate retries (idempotent registration by canonicalUrl)
//   - disputed claims (file + resolve REJECTED / ACCEPTED)
//   - accepted claim → durable removal requested
//   - provider-model deprecation metadata (AI provenance preserved)
//   - telemetry redaction (no claimant contact / emails / raw prompts)
//   - enqueue rebuild only after stale state commits (idempotency key)
// ───────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";

import { ProvenanceService } from "@/domain/provenance/provenance-service";
import type {
  ProvenanceRepository,
  ProvenanceRebuildQueue,
  ProvenanceClock,
  ProvenanceTelemetry,
} from "@/domain/provenance/ports";
import type {
  AiProvenanceRecord,
  CreatorRecord,
  OwnershipClaimRecord,
  PatternSignalState,
  ProvenanceTelemetryEvent,
  RemovalRecord,
  SourceRecord,
  SupersedingAssertion,
} from "@/domain/provenance/types";

// ─── In-memory fakes ────────────────────────────────────────────────────────

class FakeClock implements ProvenanceClock {
  now(): string {
    return "2026-08-06T00:00:00.000Z";
  }
}

class FakeTelemetry implements ProvenanceTelemetry {
  events: ProvenanceTelemetryEvent[] = [];
  emit(event: ProvenanceTelemetryEvent): void {
    this.events.push(event);
  }
}

class FakeQueue implements ProvenanceRebuildQueue {
  enqueued: { removalId: string; signalId: string; triggeredAt: string }[] = [];
  async enqueueRebuild(input: {
    removalId: string;
    signalId: string;
    triggeredAt: string;
  }): Promise<void> {
    // Idempotent by (removalId, signalId) key — duplicates are no-ops.
    const exists = this.enqueued.some(
      (e) => e.removalId === input.removalId && e.signalId === input.signalId,
    );
    if (!exists) this.enqueued.push(input);
  }
}

class FakeRepository implements ProvenanceRepository {
  creators = new Map<string, CreatorRecord>();
  sources = new Map<string, SourceRecord>();
  ai = new Map<string, AiProvenanceRecord>();
  claims = new Map<string, OwnershipClaimRecord>();
  removals = new Map<string, RemovalRecord>();
  assertions: SupersedingAssertion[] = [];
  signals = new Map<string, PatternSignalState>();
  consentRevokedAt = new Map<string, string>();
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  private iso(offsetMs = 0): string {
    return new Date(Date.parse("2026-08-06T00:00:00.000Z") + offsetMs).toISOString();
  }

  // Creators
  async createCreator(input: { name: string; url?: string | null }): Promise<CreatorRecord> {
    const id = this.nextId("creator");
    const rec: CreatorRecord = {
      id,
      name: input.name,
      url: input.url ?? null,
      verificationStatus: "UNVERIFIED",
      createdAt: this.iso(),
    };
    this.creators.set(id, rec);
    return rec;
  }

  async findCreatorById(id: string): Promise<CreatorRecord | null> {
    return this.creators.get(id) ?? null;
  }

  // Source records
  async createSourceRecord(input: {
    sourceUrl: string;
    canonicalUrl: string;
    captureMode: "MANUAL_SUBMISSION" | "URL_SUBMISSION" | "BROWSER_ASSIST";
    capturedAt: string;
    evidenceHash?: string | null;
    creatorId?: string | null;
  }): Promise<SourceRecord> {
    // Unique canonicalUrl like the DB.
    for (const s of this.sources.values()) {
      if (s.canonicalUrl === input.canonicalUrl) {
        throw new Error("unique constraint: canonicalUrl already exists");
      }
    }
    const id = this.nextId("source");
    const rec: SourceRecord = {
      id,
      sourceUrl: input.sourceUrl,
      canonicalUrl: input.canonicalUrl,
      captureMode: input.captureMode,
      capturedAt: input.capturedAt,
      evidenceHash: input.evidenceHash ?? null,
      creatorId: input.creatorId ?? null,
      createdAt: this.iso(),
    };
    this.sources.set(id, rec);
    return rec;
  }

  async findSourceRecordByCanonicalUrl(canonicalUrl: string): Promise<SourceRecord | null> {
    for (const s of this.sources.values()) {
      if (s.canonicalUrl === canonicalUrl) return s;
    }
    return null;
  }

  // AI provenance
  async createAiProvenance(input: {
    provider: string;
    modelName: string;
    generatedAt: string;
    disclosureStatus: "HUMAN" | "AI_ASSISTED" | "AI_GENERATED" | "UNKNOWN";
    promptHash?: string | null;
    outputHash?: string | null;
  }): Promise<AiProvenanceRecord> {
    const id = this.nextId("ai");
    const rec: AiProvenanceRecord = {
      id,
      provider: input.provider,
      modelName: input.modelName,
      generatedAt: input.generatedAt,
      disclosureStatus: input.disclosureStatus,
      promptHash: input.promptHash ?? null,
      outputHash: input.outputHash ?? null,
      createdAt: this.iso(),
    };
    this.ai.set(id, rec);
    return rec;
  }

  async findAiProvenanceById(id: string): Promise<AiProvenanceRecord | null> {
    return this.ai.get(id) ?? null;
  }

  // Claims
  async fileClaim(input: {
    itemId: string;
    claimantName: string;
    claimantContact: string;
    creatorId?: string | null;
  }): Promise<OwnershipClaimRecord> {
    const id = this.nextId("claim");
    const rec: OwnershipClaimRecord = {
      id,
      itemId: input.itemId,
      claimantName: input.claimantName,
      claimantContact: input.claimantContact,
      status: "PENDING",
      submittedAt: this.iso(),
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      creatorId: input.creatorId ?? null,
      createdAt: this.iso(),
    };
    this.claims.set(id, rec);
    return rec;
  }

  async findClaimById(id: string): Promise<OwnershipClaimRecord | null> {
    return this.claims.get(id) ?? null;
  }

  async resolveClaim(input: {
    claimId: string;
    decision: "ACCEPTED" | "REJECTED";
    resolvedBy: string;
    resolution: string;
  }): Promise<OwnershipClaimRecord> {
    const claim = this.claims.get(input.claimId);
    if (!claim) throw new Error(`claim ${input.claimId} not found`);
    if (claim.status !== "PENDING" && claim.status !== "UNDER_REVIEW") {
      throw new Error(`claim ${input.claimId} is not in a resolvable state`);
    }
    const updated: OwnershipClaimRecord = {
      ...claim,
      status: input.decision,
      resolvedAt: this.iso(),
      resolvedBy: input.resolvedBy,
      resolution: input.resolution,
    };
    this.claims.set(input.claimId, updated);
    return updated;
  }

  // Removals
  async requestRemoval(input: {
    itemId: string;
    requestedBy: string;
    reason: string;
  }): Promise<RemovalRecord> {
    // Idempotent: reuse an existing REQUESTED/EFFECTIVE removal.
    for (const r of this.removals.values()) {
      if (r.itemId === input.itemId && (r.status === "REQUESTED" || r.status === "EFFECTIVE")) {
        return r;
      }
    }
    const id = this.nextId("removal");
    const rec: RemovalRecord = {
      id,
      itemId: input.itemId,
      status: "REQUESTED",
      requestedBy: input.requestedBy,
      reason: input.reason,
      requestedAt: this.iso(),
      effectiveAt: null,
      completedAt: null,
      createdAt: this.iso(),
    };
    this.removals.set(id, rec);
    return rec;
  }

  async findRemovalById(id: string): Promise<RemovalRecord | null> {
    return this.removals.get(id) ?? null;
  }

  async findActiveRemovalByItemId(itemId: string): Promise<RemovalRecord | null> {
    for (const r of this.removals.values()) {
      if (r.itemId === itemId && (r.status === "REQUESTED" || r.status === "EFFECTIVE")) {
        return r;
      }
    }
    return null;
  }

  async markRemovalEffective(removalId: string): Promise<RemovalRecord> {
    const r = this.removals.get(removalId);
    if (!r) throw new Error(`removal ${removalId} not found`);
    if (r.status !== "REQUESTED") {
      throw new Error(`removal ${removalId} is not in REQUESTED state`);
    }
    const updated: RemovalRecord = {
      ...r,
      status: "EFFECTIVE",
      effectiveAt: this.iso(1000),
    };
    this.removals.set(removalId, updated);
    return updated;
  }

  async markRemovalCompleted(removalId: string): Promise<RemovalRecord> {
    const r = this.removals.get(removalId);
    if (!r) throw new Error(`removal ${removalId} not found`);
    if (r.status !== "EFFECTIVE") {
      throw new Error(`removal ${removalId} is not in EFFECTIVE state`);
    }
    const updated: RemovalRecord = {
      ...r,
      status: "COMPLETED",
      completedAt: this.iso(2000),
    };
    this.removals.set(removalId, updated);
    return updated;
  }

  // Superseding assertions
  async recordSupersedingAssertion(input: {
    targetItemId: string;
    replacesAssertionId: string;
    correctedCreatorId?: string | null;
    correctedLicenseType?: string | null;
    rationale: string;
    recordedBy: string;
  }): Promise<SupersedingAssertion> {
    const rec: SupersedingAssertion = {
      id: this.nextId("assertion"),
      targetItemId: input.targetItemId,
      replacesAssertionId: input.replacesAssertionId,
      correctedCreatorId: input.correctedCreatorId ?? null,
      correctedLicenseType:
        (input.correctedLicenseType as SupersedingAssertion["correctedLicenseType"]) ?? null,
      rationale: input.rationale,
      recordedBy: input.recordedBy,
      recordedAt: this.iso(),
    };
    this.assertions.push(rec);
    return rec;
  }

  async findLatestAssertionForItem(itemId: string): Promise<SupersedingAssertion | null> {
    const matches = this.assertions
      .filter((a) => a.targetItemId === itemId)
      .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
    return matches[0] ?? null;
  }

  // Pattern signals
  async findPatternSignalsReferencingItem(itemId: string): Promise<PatternSignalState[]> {
    return [...this.signals.values()]
      .filter((s) => s.derivedFromItemIds.includes(itemId))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }

  async markSignalStale(signalId: string, staleSince: string): Promise<PatternSignalState> {
    const s = this.signals.get(signalId);
    if (!s) throw new Error(`pattern signal ${signalId} not found`);
    const staleDate = Date.parse(staleSince);
    if (s.staleSince === null || Date.parse(s.staleSince) > staleDate) {
      const updated: PatternSignalState = {
        ...s,
        staleSince,
        rebuildState: "STALE_PENDING_REBUILD",
      };
      this.signals.set(signalId, updated);
      return updated;
    }
    return s;
  }

  async getSignalEligibility(
    signalId: string,
  ): Promise<{ eligibleItemCount: number; distinctCreatorCount: number } | null> {
    const s = this.signals.get(signalId);
    if (!s) return null;
    if (s.eligibleItemCount === null || s.distinctCreatorCount === null) return null;
    return { eligibleItemCount: s.eligibleItemCount, distinctCreatorCount: s.distinctCreatorCount };
  }

  async setSignalRebuildState(
    signalId: string,
    rebuildState: PatternSignalState["rebuildState"],
  ): Promise<PatternSignalState> {
    const s = this.signals.get(signalId);
    if (!s) throw new Error(`pattern signal ${signalId} not found`);
    const updated: PatternSignalState = { ...s, rebuildState };
    this.signals.set(signalId, updated);
    return updated;
  }

  // Consent revocation
  async revokeConsentForItem(itemId: string): Promise<{ revokedAt: string }> {
    const existing = this.consentRevokedAt.get(itemId);
    const revokedAt = existing ?? this.iso(3000);
    this.consentRevokedAt.set(itemId, revokedAt);
    // Mark referencing signals stale (earliest wins).
    for (const s of this.signals.values()) {
      if (s.derivedFromItemIds.includes(itemId)) {
        await this.markSignalStale(s.id, revokedAt);
      }
    }
    return { revokedAt };
  }
}

// ─── Test harness ───────────────────────────────────────────────────────────

let repo: FakeRepository;
let queue: FakeQueue;
let telemetry: FakeTelemetry;
let clock: FakeClock;
let service: ProvenanceService;

function makeSignal(
  id: string,
  itemIds: string[],
  eligible: number | null = null,
  creators: number | null = null,
): PatternSignalState {
  return {
    id,
    derivedFromItemIds: itemIds,
    patternType: "EDITORIAL_HERO",
    staleSince: null,
    eligibleItemCount: eligible,
    distinctCreatorCount: creators,
    rebuildState: null,
    createdAt: "2026-08-06T00:00:00.000Z",
  };
}

function validRegistration(overrides?: Partial<Parameters<typeof service.registerArtifact>[0]>) {
  return {
    creator: { name: "Ada Lovelace", url: "https://example.com/ada" },
    source: {
      sourceUrl: "https://example.com/portfolio",
      canonicalUrl: "https://example.com/portfolio#canon",
      captureMode: "URL_SUBMISSION" as const,
      capturedAt: "2026-08-06T00:00:00.000Z",
    },
    permission: { licence: "CC_BY" as const, consentTier: "PATTERN_DERIVE" as const, intendedUse: "PATTERN_DERIVE" as const },
    ...overrides,
  };
}

describe("ProvenanceService", () => {
  beforeEach(() => {
    repo = new FakeRepository();
    queue = new FakeQueue();
    telemetry = new FakeTelemetry();
    clock = new FakeClock();
    service = new ProvenanceService(repo, queue, clock, telemetry);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Registration: valid human + AI-assisted artifacts
  // ═══════════════════════════════════════════════════════════════════════

  it("registers a valid human artifact", async () => {
    const result = await service.registerArtifact(validRegistration());

    expect(result.creatorId).toBeTruthy();
    expect(result.sourceRecordId).toBeTruthy();
    expect(result.aiProvenanceId).toBeNull();
    expect(result.permission).toBe("PATTERN_DERIVE");
    expect(result.duplicated).toBe(false);

    const creator = await repo.findCreatorById(result.creatorId!);
    expect(creator!.name).toBe("Ada Lovelace");
  });

  it("registers an AI-assisted artifact with disclosure metadata", async () => {
    const result = await service.registerArtifact(
      validRegistration({
        aiProvenance: {
          provider: "OpenAI",
          modelName: "gpt-4o",
          generatedAt: "2026-08-06T00:00:00.000Z",
          disclosureStatus: "AI_ASSISTED",
          promptHash: "sha256:" + "a".repeat(64),
          outputHash: "sha256:" + "b".repeat(64),
        },
      }),
    );

    expect(result.aiProvenanceId).toBeTruthy();
    const ai = await repo.findAiProvenanceById(result.aiProvenanceId!);
    expect(ai!.disclosureStatus).toBe("AI_ASSISTED");
    expect(ai!.provider).toBe("OpenAI");
    // Metadata-minimized: hashes only, no raw prompt/output stored.
    expect(ai!.promptHash).toBe("sha256:" + "a".repeat(64));
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Absent attribution / incomplete provenance → throw + telemetry
  // ═══════════════════════════════════════════════════════════════════════

  it("rejects absent attribution and emits INCOMPLETE_PROVENANCE", async () => {
    await expect(
      service.registerArtifact(
        validRegistration({
          creator: { name: "" },
          source: { sourceUrl: "not-a-url", canonicalUrl: "", captureMode: "MANUAL_SUBMISSION", capturedAt: "nope" },
        }),
      ),
    ).rejects.toThrow(/incomplete provenance/);

    const incomplete = telemetry.events.filter((e) => e.type === "INCOMPLETE_PROVENANCE");
    expect(incomplete.length).toBe(1);
    expect(incomplete[0].type).toBe("INCOMPLETE_PROVENANCE");
    if (incomplete[0].type === "INCOMPLETE_PROVENANCE") {
      expect(incomplete[0].missing.length).toBeGreaterThan(0);
    }
    // No records were created.
    expect(repo.creators.size).toBe(0);
    expect(repo.sources.size).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Incompatible licence / consent vs intended use
  // ═══════════════════════════════════════════════════════════════════════

  it("rejects pattern-derivation intent on a NoDerivatives licence", async () => {
    await expect(
      service.registerArtifact(
        validRegistration({
          permission: {
            licence: "CC_BY_ND",
            consentTier: "FULL",
            intendedUse: "PATTERN_DERIVE",
          },
        }),
      ),
    ).rejects.toThrow(/do not permit pattern derivation/);
  });

  it("rejects FULL intent when effective permission is lower", async () => {
    await expect(
      service.registerArtifact(
        validRegistration({
          permission: {
            licence: "CC_BY_NC",
            consentTier: "FULL",
            intendedUse: "FULL",
          },
        }),
      ),
    ).rejects.toThrow(/effective permission is DISPLAY_ONLY/);
  });

  it("accepts DISPLAY_ONLY intent on a NoDerivatives licence", async () => {
    const result = await service.registerArtifact(
      validRegistration({
        permission: {
          licence: "CC_BY_ND",
          consentTier: "FULL",
          intendedUse: "DISPLAY_ONLY",
        },
      }),
    );
    expect(result.permission).toBe("DISPLAY_ONLY");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Duplicate retries — idempotent registration by canonicalUrl
  // ═══════════════════════════════════════════════════════════════════════

  it("reuses the existing source record on duplicate registration retry", async () => {
    const first = await service.registerArtifact(validRegistration());
    const second = await service.registerArtifact(validRegistration());

    expect(second.duplicated).toBe(true);
    expect(second.sourceRecordId).toBe(first.sourceRecordId);
    // No orphan rows created by the retry.
    expect(repo.sources.size).toBe(1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Claims — disputed + accepted outcomes
  // ═══════════════════════════════════════════════════════════════════════

  it("files a claim and emits CLAIM_CREATED", async () => {
    const claim = await service.fileClaim({
      itemId: "item-1",
      claimantName: "Ada Lovelace",
      claimantContact: "ada@example.com",
    });

    expect(claim.status).toBe("PENDING");
    const created = telemetry.events.filter((e) => e.type === "CLAIM_CREATED");
    expect(created.length).toBe(1);
  });

  it("resolves a disputed claim to REJECTED", async () => {
    const claim = await service.fileClaim({
      itemId: "item-1",
      claimantName: "Ada Lovelace",
      claimantContact: "ada@example.com",
    });

    const resolved = await service.resolveClaim({
      claimId: claim.id,
      decision: "REJECTED",
      resolvedBy: "reviewer-1",
      resolution: "No supporting evidence.",
    });

    expect(resolved.status).toBe("REJECTED");
    // Rejected claims do NOT trigger removal.
    expect(repo.removals.size).toBe(0);
    const resolvedEvents = telemetry.events.filter((e) => e.type === "CLAIM_RESOLVED");
    expect(resolvedEvents.length).toBe(1);
  });

  it("resolving an ACCEPTED claim requests durable removal", async () => {
    const claim = await service.fileClaim({
      itemId: "item-1",
      claimantName: "Ada Lovelace",
      claimantContact: "ada@example.com",
    });

    const resolved = await service.resolveClaim({
      claimId: claim.id,
      decision: "ACCEPTED",
      resolvedBy: "reviewer-1",
      resolution: "Ownership verified.",
    });

    expect(resolved.status).toBe("ACCEPTED");
    // Policy §8.1 + runbook: accepted claim → durable removal requested.
    const removal = await repo.findActiveRemovalByItemId("item-1");
    expect(removal).not.toBeNull();
    expect(removal!.status).toBe("REQUESTED");
    const requested = telemetry.events.filter((e) => e.type === "REMOVAL_REQUESTED");
    expect(requested.length).toBe(1);
  });

  it("requires an authorized resolution command (actor identity)", async () => {
    const claim = await service.fileClaim({
      itemId: "item-1",
      claimantName: "Ada Lovelace",
      claimantContact: "ada@example.com",
    });

    // Missing resolvedBy / resolution → schema rejects (authorization guard).
    await expect(
      service.resolveClaim({
        claimId: claim.id,
        decision: "ACCEPTED",
        resolvedBy: "",
        resolution: "",
      }),
    ).rejects.toThrow();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. Structural lessons — R2 floor (initial enforcement)
  // ═══════════════════════════════════════════════════════════════════════

  it("accepts a structural lesson with exactly 3 items / 2 creators", async () => {
    const lesson = await service.createStructuralLesson({
      patternType: "EDITORIAL_HERO",
      sourceItemCount: 3,
      distinctCreatorCount: 2,
      sectionFrequency: { hero: 3, about: 2 },
      commonTags: ["minimal"],
      averageSectionCount: 5,
    });

    expect(lesson.sourceItemCount).toBe(3);
    expect(lesson.distinctCreatorCount).toBe(2);
  });

  it("rejects a structural lesson with 3 items / 1 creator (floor)", async () => {
    await expect(
      service.createStructuralLesson({
        patternType: "EDITORIAL_HERO",
        sourceItemCount: 3,
        distinctCreatorCount: 1,
        sectionFrequency: { hero: 3 },
        commonTags: [],
        averageSectionCount: 5,
      }),
    ).rejects.toThrow(/below R2 floor/);
  });

  it("rejects a structural lesson with 2 items / 2 creators (floor)", async () => {
    await expect(
      service.createStructuralLesson({
        patternType: "EDITORIAL_HERO",
        sourceItemCount: 2,
        distinctCreatorCount: 2,
        sectionFrequency: { hero: 2 },
        commonTags: [],
        averageSectionCount: 5,
      }),
    ).rejects.toThrow(/below R2 floor/);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 7. Rebuild — floor after revocation (task-10-floor-edge)
  // ═══════════════════════════════════════════════════════════════════════

  it("marks a signal DROPPED_BELOW_FLOOR when revoking one source drops it under 3/2", async () => {
    // 3 eligible items / 2 creators initially — above floor.
    repo.signals.set("signal-1", makeSignal("signal-1", ["a", "b", "c"], 3, 2));
    const active = await service.rebuildSignal("signal-1");
    expect(active.rebuildState).toBe("ACTIVE");
    expect(telemetry.events.some((e) => e.type === "REBUILD_SUCCESS")).toBe(true);

    // One source revoked → eligibility drops to 2 items / 1 creator.
    repo.signals.set(
      "signal-1",
      makeSignal("signal-1", ["b", "c"], 2, 1),
    );

    const dropped = await service.rebuildSignal("signal-1");
    expect(dropped.rebuildState).toBe("DROPPED_BELOW_FLOOR");

    const belowFloor = telemetry.events.filter((e) => e.type === "REBUILD_BELOW_FLOOR");
    expect(belowFloor.length).toBe(1);
    if (belowFloor[0].type === "REBUILD_BELOW_FLOOR") {
      expect(belowFloor[0].itemCount).toBe(2);
      expect(belowFloor[0].creatorCount).toBe(1);
    }
  });

  it("keeps a signal ACTIVE when revocation still meets the floor", async () => {
    // 4 items / 3 creators → revoke one source → 3 items / 2 creators: still ok.
    repo.signals.set("signal-2", makeSignal("signal-2", ["a", "b", "c", "d"], 3, 2));
    const active = await service.rebuildSignal("signal-2");
    expect(active.rebuildState).toBe("ACTIVE");
    expect(telemetry.events.some((e) => e.type === "REBUILD_SUCCESS")).toBe(true);
    expect(telemetry.events.some((e) => e.type === "REBUILD_BELOW_FLOOR")).toBe(false);
  });

  it("marks REBUILD_FAILED when eligibility was never computed", async () => {
    repo.signals.set("signal-3", makeSignal("signal-3", ["a"], null, null));
    const failed = await service.rebuildSignal("signal-3");
    expect(failed.rebuildState).toBe("REBUILD_FAILED");
    expect(telemetry.events.some((e) => e.type === "REBUILD_FAILED")).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 8. Removal effectiveness — stale commits BEFORE enqueue (idempotency)
  // ═══════════════════════════════════════════════════════════════════════

  it("marks signals stale and enqueues one rebuild per signal on effective removal", async () => {
    repo.signals.set("signal-r1", makeSignal("signal-r1", ["item-rem"], 3, 2));

    const removal = await service.requestRemoval({
      itemId: "item-rem",
      requestedBy: "reviewer-1",
      reason: "Owner request",
    });
    const effective = await service.markRemovalEffective(removal.id);

    expect(effective.status).toBe("EFFECTIVE");

    // Stale state committed FIRST.
    const signal = repo.signals.get("signal-r1")!;
    expect(signal.staleSince).not.toBeNull();
    expect(signal.rebuildState).toBe("STALE_PENDING_REBUILD");

    // Exactly one enqueue with the idempotency key (removalId + signalId).
    expect(queue.enqueued.length).toBe(1);
    expect(queue.enqueued[0].removalId).toBe(removal.id);
    expect(queue.enqueued[0].signalId).toBe("signal-r1");
    expect(queue.enqueued[0].triggeredAt).toBe(effective.effectiveAt);

    // Duplicate enqueue of the same key is a no-op (queue idempotency).
    await queue.enqueueRebuild({
      removalId: removal.id,
      signalId: "signal-r1",
      triggeredAt: effective.effectiveAt!,
    });
    expect(queue.enqueued.length).toBe(1);
  });

  it("revokeConsent emits CONSENT_REVOKED + PATTERN_INVALIDATED and enqueues rebuilds", async () => {
    repo.signals.set("signal-r2", makeSignal("signal-r2", ["item-consent"], 3, 2));

    const result = await service.revokeConsent("item-consent", "reviewer-1");

    expect(result.revokedAt).toBeTruthy();
    expect(telemetry.events.some((e) => e.type === "CONSENT_REVOKED")).toBe(true);
    expect(telemetry.events.some((e) => e.type === "PATTERN_INVALIDATED")).toBe(true);

    const signal = repo.signals.get("signal-r2")!;
    expect(signal.staleSince).toBe(result.revokedAt);

    // Consent revocation carries no removal record → itemId is the trigger key.
    expect(queue.enqueued.length).toBe(1);
    expect(queue.enqueued[0].removalId).toBe("item-consent");
    expect(queue.enqueued[0].signalId).toBe("signal-r2");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 9. Superseding attribution (R3 immutability)
  // ═══════════════════════════════════════════════════════════════════════

  it("records a superseding assertion correcting at least one field", async () => {
    const assertion = await service.supersedeAttribution({
      targetItemId: "item-1",
      replacesAssertionId: "orig-assertion",
      correctedCreatorId: "creator-2",
      rationale: "Creator confirmed actual author.",
      recordedBy: "reviewer-1",
    });

    expect(assertion.correctedCreatorId).toBe("creator-2");
    expect(assertion.targetItemId).toBe("item-1");
  });

  it("rejects a superseding assertion that corrects nothing", async () => {
    await expect(
      service.supersedeAttribution({
        targetItemId: "item-1",
        replacesAssertionId: "orig-assertion",
        rationale: "No actual correction.",
        recordedBy: "reviewer-1",
      }),
    ).rejects.toThrow(/correct at least one attribution field/);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 10. Telemetry redaction (policy §12) — no claimant contact / emails
  // ═══════════════════════════════════════════════════════════════════════

  it("never includes claimant contact or emails in telemetry", async () => {
    await service.fileClaim({
      itemId: "item-1",
      claimantName: "Ada Lovelace",
      claimantContact: "private-ada@example.com",
    });

    const serialized = JSON.stringify(telemetry.events);
    expect(serialized).not.toContain("private-ada@example.com");
    expect(serialized).not.toContain("ada@example.com");
    // No email address anywhere in the telemetry payload.
    expect(serialized).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  });

  it("telemetry payloads carry only IDs, enums, and counts", async () => {
    repo.signals.set("signal-t1", makeSignal("signal-t1", ["a", "b", "c"], 2, 1));
    await service.revokeConsent("a", "reviewer-1");
    await service.rebuildSignal("signal-t1");

    for (const event of telemetry.events) {
      const json = JSON.stringify(event);
      // Never raw content, prompts, URLs with query strings, or claimant data.
      expect(json).not.toMatch(/contentBlob/);
      expect(json).not.toMatch(/prompt/);
      expect(json).not.toContain("?query=");
      expect(json).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 11. Provider-model deprecation metadata is preserved (not a failure)
  // ═══════════════════════════════════════════════════════════════════════

  it("preserves deprecated provider/model metadata on AI provenance", async () => {
    const result = await service.registerArtifact(
      validRegistration({
        aiProvenance: {
          provider: "OpenAI",
          modelName: "text-davinci-003 (deprecated)",
          generatedAt: "2026-08-06T00:00:00.000Z",
          disclosureStatus: "AI_GENERATED",
        },
      }),
    );

    const ai = await repo.findAiProvenanceById(result.aiProvenanceId!);
    expect(ai!.modelName).toBe("text-davinci-003 (deprecated)");
    expect(ai!.disclosureStatus).toBe("AI_GENERATED");
  });

  it("rejects UNKNOWN disclosure for NEW AI provenance (mandatory disclosure)", async () => {
    await expect(
      service.registerArtifact(
        validRegistration({
          aiProvenance: {
            provider: "OpenAI",
            modelName: "gpt-4o",
            generatedAt: "2026-08-06T00:00:00.000Z",
            disclosureStatus: "UNKNOWN",
          },
        }),
      ),
    ).rejects.toThrow(/incomplete provenance/);
  });
});
