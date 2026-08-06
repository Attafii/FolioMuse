// ─── Shared test fakes (ponytail: single source — used by security-contract and
// abuse-cases suites; identical copy-paste was extracted here, behavior unchanged).
// Synthetic fixtures only (RFC 2606 .invalid). ─────────────────────────────────

import { vi } from "vitest";

import { ProvenanceService } from "@/domain/provenance/provenance-service";
import type {
  ProvenanceClock,
  ProvenanceRebuildQueue,
  ProvenanceRepository,
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
} from "@/domain/provenance/types";

export const TS = "2026-08-06T00:00:00.000Z";

const clock: ProvenanceClock = { now: () => TS };

/** Minimal in-memory ProvenanceRepository supporting the exercised flows. */
export function makeRepo(): ProvenanceRepository {
  const creators = new Map<string, CreatorRecord>();
  const sources = new Map<string, SourceRecord>();
  const aiRecords = new Map<string, AiProvenanceRecord>();
  const claims = new Map<string, OwnershipClaimRecord>();
  const removals = new Map<string, RemovalRecord>();
  const signals = new Map<string, PatternSignalState>();
  let n = 0;

  const repo: ProvenanceRepository = {
    createCreator: vi.fn(async (input) => {
      const rec: CreatorRecord = {
        id: `creator-${++n}`,
        name: input.name,
        url: input.url ?? null,
        verificationStatus: "UNVERIFIED",
        createdAt: TS,
      };
      creators.set(rec.id, rec);
      return rec;
    }),
    findCreatorById: vi.fn(async (id) => creators.get(id) ?? null),
    createSourceRecord: vi.fn(async (input) => {
      const rec: SourceRecord = {
        id: `source-${++n}`,
        sourceUrl: input.sourceUrl,
        canonicalUrl: input.canonicalUrl,
        captureMode: input.captureMode,
        capturedAt: input.capturedAt,
        evidenceHash: input.evidenceHash ?? null,
        creatorId: input.creatorId ?? null,
        createdAt: TS,
      };
      sources.set(rec.id, rec);
      return rec;
    }),
    findSourceRecordByCanonicalUrl: vi.fn(async (url) =>
      [...sources.values()].find((s) => s.canonicalUrl === url) ?? null,
    ),
    createAiProvenance: vi.fn(async (input) => {
      const rec: AiProvenanceRecord = {
        id: `ai-${++n}`,
        provider: input.provider,
        modelName: input.modelName,
        generatedAt: input.generatedAt,
        disclosureStatus: input.disclosureStatus,
        promptHash: input.promptHash ?? null,
        outputHash: input.outputHash ?? null,
        createdAt: TS,
      };
      aiRecords.set(rec.id, rec);
      return rec;
    }),
    findAiProvenanceById: vi.fn(async (id) => aiRecords.get(id) ?? null),
    fileClaim: vi.fn(async (input) => {
      const rec: OwnershipClaimRecord = {
        id: `claim-${++n}`,
        itemId: input.itemId,
        claimantName: input.claimantName,
        claimantContact: input.claimantContact,
        status: "PENDING",
        submittedAt: TS,
        resolvedAt: null,
        resolvedBy: null,
        resolution: null,
        creatorId: input.creatorId ?? null,
        createdAt: TS,
      };
      claims.set(rec.id, rec);
      return rec;
    }),
    findClaimById: vi.fn(async (id) => claims.get(id) ?? null),
    resolveClaim: vi.fn(async (input) => {
      const claim = claims.get(input.claimId);
      if (!claim) throw new Error(`claim ${input.claimId} not found`);
      const updated: OwnershipClaimRecord = {
        ...claim,
        status: input.decision,
        resolvedAt: TS,
        resolvedBy: input.resolvedBy,
        resolution: input.resolution,
      };
      claims.set(claim.id, updated);
      return updated;
    }),
    requestRemoval: vi.fn(async (input) => {
      const existing = [...removals.values()].find(
        (r) => r.itemId === input.itemId && (r.status === "REQUESTED" || r.status === "EFFECTIVE"),
      );
      if (existing) return existing;
      const rec: RemovalRecord = {
        id: `removal-${++n}`,
        itemId: input.itemId,
        status: "REQUESTED",
        requestedBy: input.requestedBy,
        reason: input.reason,
        requestedAt: TS,
        effectiveAt: null,
        completedAt: null,
        createdAt: TS,
      };
      removals.set(rec.id, rec);
      return rec;
    }),
    findRemovalById: vi.fn(async (id) => removals.get(id) ?? null),
    findActiveRemovalByItemId: vi.fn(async (itemId) =>
      [...removals.values()].find(
        (r) => r.itemId === itemId && (r.status === "REQUESTED" || r.status === "EFFECTIVE"),
      ) ?? null,
    ),
    markRemovalEffective: vi.fn(async (id) => {
      const r = removals.get(id);
      if (!r || r.status !== "REQUESTED") throw new Error(`removal ${id} not in REQUESTED state`);
      const updated = { ...r, status: "EFFECTIVE" as const, effectiveAt: TS };
      removals.set(id, updated);
      return updated;
    }),
    markRemovalCompleted: vi.fn(async (id) => {
      const r = removals.get(id);
      if (!r || r.status !== "EFFECTIVE") throw new Error(`removal ${id} not in EFFECTIVE state`);
      const updated = { ...r, status: "COMPLETED" as const, completedAt: TS };
      removals.set(id, updated);
      return updated;
    }),
    recordSupersedingAssertion: vi.fn(async (input) => ({
      id: `assertion-${++n}`,
      targetItemId: input.targetItemId,
      replacesAssertionId: input.replacesAssertionId,
      correctedCreatorId: input.correctedCreatorId ?? null,
      correctedLicenseType: input.correctedLicenseType ?? null,
      rationale: input.rationale,
      recordedBy: input.recordedBy,
      recordedAt: TS,
    })),
    findLatestAssertionForItem: vi.fn(async () => null),
    findPatternSignalsReferencingItem: vi.fn(async (itemId) =>
      [...signals.values()].filter((s) => s.derivedFromItemIds.includes(itemId)),
    ),
    markSignalStale: vi.fn(async (signalId, staleSince) => {
      const s = signals.get(signalId);
      if (!s) throw new Error(`signal ${signalId} not found`);
      const updated: PatternSignalState = {
        ...s,
        staleSince: s.staleSince ?? staleSince,
        rebuildState: "STALE_PENDING_REBUILD",
      };
      signals.set(signalId, updated);
      return updated;
    }),
    getSignalEligibility: vi.fn(async (signalId) => {
      const s = signals.get(signalId);
      if (!s || s.eligibleItemCount === null || s.distinctCreatorCount === null) return null;
      return { eligibleItemCount: s.eligibleItemCount, distinctCreatorCount: s.distinctCreatorCount };
    }),
    setSignalRebuildState: vi.fn(async (signalId, rebuildState) => {
      const s = signals.get(signalId);
      if (!s) throw new Error(`signal ${signalId} not found`);
      const updated: PatternSignalState = { ...s, rebuildState };
      signals.set(signalId, updated);
      return updated;
    }),
    revokeConsentForItem: vi.fn(async (itemId) => {
      void itemId;
      return { revokedAt: TS };
    }),
  };
  return repo;
}

export function makeSignal(
  id: string,
  itemIds: string[],
  counts: { eligibleItemCount: number; distinctCreatorCount: number } | null,
): PatternSignalState {
  return {
    id,
    derivedFromItemIds: itemIds,
    patternType: "EDITORIAL_HERO",
    staleSince: null,
    eligibleItemCount: counts?.eligibleItemCount ?? null,
    distinctCreatorCount: counts?.distinctCreatorCount ?? null,
    rebuildState: null,
    createdAt: TS,
  };
}

export function makeService(events: ProvenanceTelemetryEvent[], repo: ProvenanceRepository) {
  const telemetry: ProvenanceTelemetry = { emit: (e) => events.push(e) };
  const queue: ProvenanceRebuildQueue = {
    enqueueRebuild: vi.fn(async () => undefined),
  };
  return new ProvenanceService(repo, queue, clock, telemetry);
}

export function registerInput(overrides?: Record<string, unknown>) {
  return {
    creator: { name: "Synthetic Creator", url: "https://example.invalid/creator" },
    source: {
      sourceUrl: "https://example.invalid/portfolio",
      canonicalUrl: "https://example.invalid/portfolio",
      captureMode: "MANUAL_SUBMISSION" as const,
      capturedAt: TS,
    },
    permission: { licence: "CC_BY" as const, consentTier: "PATTERN_DERIVE" as const, intendedUse: "PATTERN_DERIVE" as const },
    ...overrides,
  };
}
