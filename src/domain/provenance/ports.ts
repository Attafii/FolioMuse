// ─── Provenance Port Interfaces (ADR-0003 / policy) ──────────────────────
// Framework-agnostic domain interfaces. Implementations live in
// src/persistence/ and MUST NOT be imported by UI code (AGENTS.md §7).
// NO Prisma/Next imports — these are pure TypeScript interfaces.
//
// Design rules:
// - Read methods return SAFE domain records (never raw captures, never
//   content blobs, never claimant private evidence beyond the internal
//   OwnershipClaimRecord which itself is repository-internal).
// - Writes are explicit commands with narrow shapes.
// - NO generic CRUD, NO update/delete path for audit/removal history
//   (ADR-0002 append-only rule, policy §8.2 durable removal).

import type {
  AiProvenanceRecord,
  CreatorRecord,
  FileOwnershipClaimInput,
  NewAiProvenanceInput,
  NewCreatorInput,
  NewSourceRecordInput,
  OwnershipClaimRecord,
  PatternSignalState,
  ProvenanceTelemetryEvent,
  RemovalRecord,
  RequestRemovalInput,
  ResolveOwnershipClaimInput,
  SourceRecord,
  SupersedeAttributionInput,
  SupersedingAssertion,
} from "./types";

// ─── ProvenanceRepository ─────────────────────────────────────────────────
// Persistence for provenance records. All methods are narrow commands.

export interface ProvenanceRepository {
  // Creators (explicit canonicalization only — ADR-0003 D5)
  createCreator(input: NewCreatorInput): Promise<CreatorRecord>;
  findCreatorById(id: string): Promise<CreatorRecord | null>;

  // Source records
  createSourceRecord(input: NewSourceRecordInput): Promise<SourceRecord>;
  findSourceRecordByCanonicalUrl(canonicalUrl: string): Promise<SourceRecord | null>;

  // AI provenance (metadata-minimized — policy §6.2)
  createAiProvenance(input: NewAiProvenanceInput): Promise<AiProvenanceRecord>;
  findAiProvenanceById(id: string): Promise<AiProvenanceRecord | null>;

  // Ownership claims (policy §8.1)
  fileClaim(input: FileOwnershipClaimInput): Promise<OwnershipClaimRecord>;
  findClaimById(id: string): Promise<OwnershipClaimRecord | null>;
  resolveClaim(input: ResolveOwnershipClaimInput): Promise<OwnershipClaimRecord>;

  // Removals (durable — policy §8.2, §9)
  requestRemoval(input: RequestRemovalInput): Promise<RemovalRecord>;
  findRemovalById(id: string): Promise<RemovalRecord | null>;
  findActiveRemovalByItemId(itemId: string): Promise<RemovalRecord | null>;
  markRemovalEffective(removalId: string): Promise<RemovalRecord>;
  markRemovalCompleted(removalId: string): Promise<RemovalRecord>;

  // Superseding assertions (attribution immutability — policy §7.2)
  recordSupersedingAssertion(input: SupersedeAttributionInput): Promise<SupersedingAssertion>;
  findLatestAssertionForItem(itemId: string): Promise<SupersedingAssertion | null>;

  // Pattern signal eligibility / staleness / rebuild (policy §9)
  findPatternSignalsReferencingItem(itemId: string): Promise<PatternSignalState[]>;
  markSignalStale(signalId: string, staleSince: string): Promise<PatternSignalState>;
  getSignalEligibility(signalId: string): Promise<{
    eligibleItemCount: number;
    distinctCreatorCount: number;
  } | null>;
  setSignalRebuildState(
    signalId: string,
    rebuildState: PatternSignalState["rebuildState"],
  ): Promise<PatternSignalState>;

  // Consent revocation (recorded on the original grant — ADR-0003 D3)
  revokeConsentForItem(itemId: string, revokedBy: string): Promise<{ revokedAt: string }>;

  // NO update()/delete() for audit/removal history — durable by contract.
}

// ─── ProvenanceRebuildQueue ───────────────────────────────────────────────
// Idempotent async rebuild enqueueing (policy §9.1, ADR-0003 D8).
// Implementations may back on a queue provider, but the PORT is provider-agnostic.

export interface ProvenanceRebuildQueue {
  /**
   * Enqueues a rebuild decision. MUST be idempotent for the same
   * (removalId, signalId) pair — duplicate enqueues are no-ops.
   */
  enqueueRebuild(input: {
    removalId: string;
    signalId: string;
    triggeredAt: string;
  }): Promise<void>;
}

// ─── Clock ────────────────────────────────────────────────────────────────
// Injectable time source so domain logic is deterministic and testable.

export interface ProvenanceClock {
  now(): string; // ISO 8601 datetime
}

// ─── ProvenanceTelemetry ──────────────────────────────────────────────────
// Privacy-minimized structured events (policy §12).

export interface ProvenanceTelemetry {
  emit(event: ProvenanceTelemetryEvent): void;
}
