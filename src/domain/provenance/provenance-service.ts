// ─── ProvenanceService Domain Logic ─────────────────────────────────────────
// Implements the provenance policy (docs/product/provenance-and-originality-
// policy.md) + ADR-0003 + originality rules R2/R3/R5/R6.
//
// Orchestrates the injected ports (ProvenanceRepository, ProvenanceRebuildQueue,
// ProvenanceClock, ProvenanceTelemetry) — NO Prisma/Next imports (AGENTS.md §7).
//
// Design rules:
//   - Every external input is validated with the strict Zod schemas from
//     schemas.ts BEFORE any repository write. Policy violations throw — they
//     are never swallowed.
//   - R2 floor (>=3 eligible items AND >=2 distinct creators) is enforced both
//     initially (createStructuralLesson) and after revocation (rebuildSignal).
//   - Consent revocation and removal-effectiveness atomically mark referencing
//     PatternSignals stale via the repository, and rebuild work is enqueued by
//     idempotency key ONLY AFTER the stale state commits (policy §9.1).
//   - Telemetry is privacy-minimized (policy §12): IDs, enum reasons, counts —
//     never claimant contact, emails, raw prompts, or content.
//   - Claims are resolved only through an authorized resolution command
//     carrying actor identity (ResolveOwnershipClaimInput); the service never
//     adjudicates ownership on its own.
// ────────────────────────────────────────────────────────────────────────────

import type {
  AiProvenanceRecord,
  FileOwnershipClaimInput,
  LicenceId,
  NewAiProvenanceInput,
  NewCreatorInput,
  NewSourceRecordInput,
  OwnershipClaimRecord,
  PatternSignalState,
  PermissionResult,
  ProvenanceTelemetryEvent,
  RemovalRecord,
  RequestRemovalInput,
  ResolveOwnershipClaimInput,
  SupersedeAttributionInput,
  SupersedingAssertion,
} from "./types";

import {
  FileOwnershipClaimInputSchema,
  NewAiProvenanceInputSchema,
  NewCreatorInputSchema,
  NewSourceRecordInputSchema,
  ProvenanceTelemetryEventSchema,
  RequestRemovalInputSchema,
  ResolveOwnershipClaimInputSchema,
  R2_MIN_DISTINCT_CREATORS,
  R2_MIN_ELIGIBLE_ITEMS,
  StructuralLessonSchema,
  SupersedeAttributionInputSchema,
  derivePermissionResult,
} from "./schemas";
import type { StructuralLesson } from "./schemas";

import type {
  ProvenanceClock,
  ProvenanceRebuildQueue,
  ProvenanceRepository,
  ProvenanceTelemetry,
} from "./ports";

// ─── Registration Input ─────────────────────────────────────────────────────
// Binds a creator + source capture (+ optional AI provenance) into the
// provenance graph. `permission.intendedUse` declares what the registering
// surface intends to do; the service computes the effective permission
// (licence ∩ consent ∩ policy) and rejects incompatible intent.

export interface RegisterArtifactInput {
  creator: NewCreatorInput;
  source: NewSourceRecordInput;
  aiProvenance?: NewAiProvenanceInput;
  permission: {
    licence: LicenceId;
    consentTier: "DISPLAY" | "PATTERN_DERIVE" | "FULL";
    intendedUse: PermissionResult;
  };
}

export interface RegistrationResult {
  creatorId: string | null;
  sourceRecordId: string;
  aiProvenanceId: string | null;
  permission: PermissionResult;
  /** true when a prior registration with the same canonicalUrl was reused. */
  duplicated: boolean;
}

// ─── Implementation ─────────────────────────────────────────────────────────

export class ProvenanceService {
  constructor(
    private readonly repository: ProvenanceRepository,
    private readonly queue: ProvenanceRebuildQueue,
    private readonly clock: ProvenanceClock,
    private readonly telemetry: ProvenanceTelemetry,
  ) {}

  // ── 1. registerArtifact ──────────────────────────────────────────────────

  async registerArtifact(input: RegisterArtifactInput): Promise<RegistrationResult> {
    // Validate every input with strict schemas BEFORE any write.
    const missing: string[] = [];
    const creatorParsed = NewCreatorInputSchema.safeParse(input.creator);
    if (!creatorParsed.success) missing.push("creator");
    const sourceParsed = NewSourceRecordInputSchema.safeParse(input.source);
    if (!sourceParsed.success) missing.push("source");
    // `null` when AI provenance is absent (human-authored artifact). A FAILED
    // AI parse counts as incomplete provenance, but the ABSENCE of AI
    // provenance is legitimate — so the guard must treat null as valid.
    const aiParsed:
      | { success: true; data: NewAiProvenanceInput }
      | { success: false }
      | null = input.aiProvenance ? NewAiProvenanceInputSchema.safeParse(input.aiProvenance) : null;
    if (aiParsed && !aiParsed.success) missing.push("aiProvenance");

    // Absent attribution / incomplete provenance is a policy violation —
    // emit minimized telemetry then throw (never swallow). The guard must
    // test the parse results directly (not `missing.length`) so TypeScript
    // can narrow `creator`/`source` as defined afterwards.
    if (
      !creatorParsed.success ||
      !sourceParsed.success ||
      (aiParsed !== null && !aiParsed.success)
    ) {
      this.emitTelemetry({
        type: "INCOMPLETE_PROVENANCE",
        itemId: input.source.canonicalUrl,
        missing,
        timestamp: this.clock.now(),
      });
      throw new Error(
        `Registration rejected: incomplete provenance (missing: ${missing.join(", ")})`,
      );
    }
    const creator = creatorParsed.data;
    const source = sourceParsed.data;

    // Licence ∩ consent ∩ policy compatibility (policy §5.2, ADR-0003 D3).
    const permission = derivePermissionResult(
      input.permission.licence,
      input.permission.consentTier,
    );
    if (input.permission.intendedUse === "PATTERN_DERIVE" && permission === "DISPLAY_ONLY") {
      throw new Error(
        `Registration rejected: licence ${input.permission.licence} + consent ` +
          `${input.permission.consentTier} do not permit pattern derivation ` +
          `(effective permission: DISPLAY_ONLY)`,
      );
    }
    if (input.permission.intendedUse === "FULL" && permission !== "FULL") {
      throw new Error(
        `Registration rejected: effective permission is ${permission}, ` +
          `not FULL (licence ${input.permission.licence} + consent ${input.permission.consentTier})`,
      );
    }

    // Idempotent registration: reuse an existing source record for the same
    // canonicalUrl (duplicate retries must not create orphan rows).
    const existing = await this.repository.findSourceRecordByCanonicalUrl(
      source.canonicalUrl,
    );
    if (existing) {
      return {
        creatorId: existing.creatorId,
        sourceRecordId: existing.id,
        aiProvenanceId: null,
        permission,
        duplicated: true,
      };
    }

    const creatorRecord = await this.repository.createCreator(creator);
    const sourceRecord = await this.repository.createSourceRecord({
      ...source,
      creatorId: creatorRecord.id,
    });
    let aiProvenance: AiProvenanceRecord | null = null;
    if (aiParsed) {
      aiProvenance = await this.repository.createAiProvenance(aiParsed.data);
    }

    return {
      creatorId: creatorRecord.id,
      sourceRecordId: sourceRecord.id,
      aiProvenanceId: aiProvenance?.id ?? null,
      permission,
      duplicated: false,
    };
  }

  // ── 2. Ownership claims ──────────────────────────────────────────────────

  async fileClaim(input: FileOwnershipClaimInput): Promise<OwnershipClaimRecord> {
    const parsed = FileOwnershipClaimInputSchema.parse(input);
    const claim = await this.repository.fileClaim(parsed);
    this.emitTelemetry({
      type: "CLAIM_CREATED",
      claimId: claim.id,
      itemId: claim.itemId,
      timestamp: this.clock.now(),
    });
    return claim;
  }

  async resolveClaim(input: ResolveOwnershipClaimInput): Promise<OwnershipClaimRecord> {
    // Authorized resolution command: the input MUST carry the acting reviewer
    // identity + resolution text (schema enforced). The service never decides
    // claim truth on its own — it only applies the explicit decision.
    const parsed = ResolveOwnershipClaimInputSchema.parse(input);
    const claim = await this.repository.resolveClaim(parsed);
    this.emitTelemetry({
      type: "CLAIM_RESOLVED",
      claimId: claim.id,
      itemId: claim.itemId,
      status: claim.status,
      timestamp: this.clock.now(),
    });

    // Policy §8.1 + runbook: an ACCEPTED claim means the disputed item's
    // listing is no longer the claimant's authorized representation — request
    // durable removal (never deletion). Full archival wiring is T11.
    if (claim.status === "ACCEPTED") {
      await this.requestRemoval({
        itemId: claim.itemId,
        requestedBy: parsed.resolvedBy,
        reason: "Ownership claim accepted — disputed listing removed from circulation",
      });
    }
    return claim;
  }

  // ── 3. Removals (durable — policy §8.2, §9) ──────────────────────────────

  async requestRemoval(input: RequestRemovalInput): Promise<RemovalRecord> {
    const parsed = RequestRemovalInputSchema.parse(input);
    // Repository is idempotent: concurrent identical invalidations produce
    // ONE removal per item (policy §9.1 step 3).
    const removal = await this.repository.requestRemoval(parsed);
    this.emitTelemetry({
      type: "REMOVAL_REQUESTED",
      removalId: removal.id,
      itemId: removal.itemId,
      timestamp: this.clock.now(),
    });
    return removal;
  }

  async markRemovalEffective(removalId: string): Promise<RemovalRecord> {
    // Guarded by the repository: only REQUESTED → EFFECTIVE (policy §9).
    const removal = await this.repository.markRemovalEffective(removalId);
    this.emitTelemetry({
      type: "REMOVAL_EFFECTIVE",
      removalId: removal.id,
      itemId: removal.itemId,
      timestamp: this.clock.now(),
    });

    if (removal.effectiveAt) {
      // Invalidate every derived signal referencing the removed item, then
      // enqueue the rebuild decision by idempotency key (removalId+signalId)
      // — ONLY AFTER the stale state commits (policy §9.1 step 2 → step 3).
      const signals = await this.repository.findPatternSignalsReferencingItem(
        removal.itemId,
      );
      for (const signal of signals) {
        await this.repository.markSignalStale(signal.id, removal.effectiveAt);
        this.emitTelemetry({
          type: "PATTERN_INVALIDATED",
          signalId: signal.id,
          timestamp: this.clock.now(),
        });
        await this.queue.enqueueRebuild({
          removalId: removal.id,
          signalId: signal.id,
          triggeredAt: removal.effectiveAt,
        });
      }
    }
    return removal;
  }

  async markRemovalCompleted(removalId: string): Promise<RemovalRecord> {
    // Guarded by the repository: only EFFECTIVE → COMPLETED.
    return this.repository.markRemovalCompleted(removalId);
  }

  // ── 4. Superseding attribution (R3 immutability — policy §7.2) ───────────

  async supersedeAttribution(
    input: SupersedeAttributionInput,
  ): Promise<SupersedingAssertion> {
    // Schema enforces: at least one corrected field must be present.
    const parsed = SupersedeAttributionInputSchema.parse(input);
    return this.repository.recordSupersedingAssertion(parsed);
  }

  // ── 5. Consent revocation (atomic — policy §3.2, ADR-0003 D3/D8) ─────────

  async revokeConsent(itemId: string, revokedBy: string): Promise<{ revokedAt: string }> {
    // Repository transaction: records revokedAt on the ORIGINAL grant row AND
    // marks all referencing signals stale in ONE commit. Only after that
    // commit succeeds do we emit telemetry and enqueue rebuilds.
    const { revokedAt } = await this.repository.revokeConsentForItem(itemId, revokedBy);
    this.emitTelemetry({
      type: "CONSENT_REVOKED",
      itemId,
      timestamp: this.clock.now(),
    });

    const signals = await this.repository.findPatternSignalsReferencingItem(itemId);
    for (const signal of signals) {
      if (signal.staleSince) {
        this.emitTelemetry({
          type: "PATTERN_INVALIDATED",
          signalId: signal.id,
          timestamp: this.clock.now(),
        });
        // Consent revocation carries no removal record; the itemId serves as
        // the idempotency trigger key so duplicate revocations enqueue once.
        await this.queue.enqueueRebuild({
          removalId: itemId,
          signalId: signal.id,
          triggeredAt: revokedAt,
        });
      }
    }
    return { revokedAt };
  }

  // ── 6. Structural lessons + rebuild (R2 floor — policy §9.2, §10.1) ──────

  /** Initial floor enforcement: a lesson may only be created above the R2
   *  floor (>=3 eligible items AND >=2 distinct creators). */
  async createStructuralLesson(input: StructuralLesson): Promise<StructuralLesson> {
    const parsed = StructuralLessonSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(
        `Structural lesson rejected: below R2 floor ` +
          `(>= ${R2_MIN_ELIGIBLE_ITEMS} eligible items AND ` +
          `>= ${R2_MIN_DISTINCT_CREATORS} distinct creators required)`,
      );
    }
    return parsed.data;
  }

  /** Rebuild evaluation after invalidation/revocation: recomputed eligibility
   *  is compared against the R2 floor. Above floor → ACTIVE; below →
   *  DROPPED_BELOW_FLOOR (excluded from active suggestions, never deleted). */
  async rebuildSignal(signalId: string): Promise<PatternSignalState> {
    const eligibility = await this.repository.getSignalEligibility(signalId);
    if (eligibility === null) {
      // Not-yet-computed counts → the signal cannot be rebuilt; record failure
      // and emit REBUILD_FAILED telemetry (bounded retries, no model calls).
      const failed = await this.repository.setSignalRebuildState(
        signalId,
        "REBUILD_FAILED",
      );
      this.emitTelemetry({
        type: "REBUILD_FAILED",
        signalId,
        timestamp: this.clock.now(),
      });
      return failed;
    }

    const aboveFloor =
      eligibility.eligibleItemCount >= R2_MIN_ELIGIBLE_ITEMS &&
      eligibility.distinctCreatorCount >= R2_MIN_DISTINCT_CREATORS;

    if (aboveFloor) {
      const active = await this.repository.setSignalRebuildState(signalId, "ACTIVE");
      this.emitTelemetry({
        type: "REBUILD_SUCCESS",
        signalId,
        timestamp: this.clock.now(),
      });
      return active;
    }

    const dropped = await this.repository.setSignalRebuildState(
      signalId,
      "DROPPED_BELOW_FLOOR",
    );
    this.emitTelemetry({
      type: "REBUILD_BELOW_FLOOR",
      signalId,
      itemCount: eligibility.eligibleItemCount,
      creatorCount: eligibility.distinctCreatorCount,
      timestamp: this.clock.now(),
    });
    return dropped;
  }

  // ── emitTelemetry ────────────────────────────────────────────────────────
  // Privacy-minimized, validated before emit. A telemetry failure must never
  // break the policy flow — it is a non-critical concern (policy §12).

  emitTelemetry(event: ProvenanceTelemetryEvent): void {
    try {
      const validated = ProvenanceTelemetryEventSchema.parse(event);
      this.telemetry.emit(validated);
    } catch {
      // Discard silently — telemetry is best-effort.
    }
  }
}
