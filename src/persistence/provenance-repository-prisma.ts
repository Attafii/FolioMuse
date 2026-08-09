// ─── ProvenanceRepositoryPrisma ─────────────────────────────────────────────
// Translates the ProvenanceRepository domain port (src/domain/provenance/ports.ts)
// into Prisma queries against the Neon-hosted PostgreSQL database.
//
// DESIGN NOTES:
//   - Prisma client singleton imported from src/lib/prisma.ts (Prisma 7 +
//     @prisma/adapter-neon driver adapter).
//   - All Prisma Date/DateTime values are mapped to ISO 8601 strings at the
//     boundary. No raw Date objects cross into the domain layer.
//   - DURABLE HISTORY (ADR-0003 D7 / policy §8.2): no update()/delete() on
//     audit, claim, or removal history. The only writes are the narrow,
//     explicit commands declared by the port.
//   - R3 IMMUTABILITY: attribution corrections are recorded as superseding
//     assertions (recordSupersedingAssertion); the historical attribution and
//     assertion rows are never mutated.
//   - IDEMPOTENCY: requestRemoval reuses an existing active removal for the
//     item; revokeConsentForItem never overwrites an existing revokedAt;
//     markSignalStale keeps the earliest staleSince. This guarantees that
//     concurrent identical invalidations produce one removal and one rebuild
//     target per signal.
//   - PRIVACY: claimantContact appears ONLY on the internal OwnershipClaimRecord
//     returned by findClaimById. No other read method returns claimant data.
//   - SAFE READS: read methods return domain records only — never raw source
//     captures, content blobs, or claimant private evidence (ADR-0001).
// ────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import type {
  AiProvenance as AiProvenanceModel,
  Creator as CreatorModel,
  OwnershipClaim as OwnershipClaimModel,
  PatternSignal as PatternSignalModel,
  RemovalRecord as RemovalRecordModel,
  SourceRecord as SourceRecordModel,
  SupersedingAssertion as SupersedingAssertionModel,
} from "@/generated/prisma/client";

import type { ProvenanceRepository } from "@/domain/provenance/ports";
import type {
  AiProvenanceRecord,
  CaptureMode,
  ClaimStatus,
  CreatorRecord,
  CreatorVerificationStatus,
  DisclosureStatus,
  LicenceId,
  NewAiProvenanceInput,
  NewCreatorInput,
  NewSourceRecordInput,
  OwnershipClaimRecord,
  PatternSignalState,
  RebuildState,
  RemovalRecord,
  RemovalStatus,
  SourceRecord,
  SupersedeAttributionInput,
  SupersedingAssertion,
} from "@/domain/provenance/types";

// ─── DB → Domain Mappers ────────────────────────────────────────────────────
// All DateTime columns are converted to ISO 8601 strings.
// String vocabulary columns are cast to the domain union types (the Zod layer
// validates; the DB stores strings per the evolving-vocabulary decision).

function mapDbCreator(db: CreatorModel): CreatorRecord {
  return {
    id: db.id,
    name: db.name,
    url: db.url,
    verificationStatus: db.verificationStatus as CreatorVerificationStatus,
    createdAt: db.createdAt.toISOString(),
  };
}

function mapDbSourceRecord(db: SourceRecordModel): SourceRecord {
  return {
    id: db.id,
    sourceUrl: db.sourceUrl,
    canonicalUrl: db.canonicalUrl,
    captureMode: db.captureMode as CaptureMode,
    capturedAt: db.capturedAt.toISOString(),
    evidenceHash: db.evidenceHash,
    creatorId: db.creatorId,
    createdAt: db.createdAt.toISOString(),
  };
}

function mapDbAiProvenance(db: AiProvenanceModel): AiProvenanceRecord {
  return {
    id: db.id,
    provider: db.provider,
    modelName: db.modelName,
    generatedAt: db.generatedAt.toISOString(),
    disclosureStatus: db.disclosureStatus as DisclosureStatus,
    promptHash: db.promptHash,
    outputHash: db.outputHash,
    createdAt: db.createdAt.toISOString(),
  };
}

function mapDbOwnershipClaim(db: OwnershipClaimModel): OwnershipClaimRecord {
  return {
    id: db.id,
    itemId: db.itemId,
    claimantName: db.claimantName,
    // NOTE: claimantContact is private (policy §8.3) — carried on the internal
    // record only; never exposed by safe reads or public projections.
    claimantContact: db.claimantContact,
    status: db.status as ClaimStatus,
    submittedAt: db.submittedAt.toISOString(),
    resolvedAt: db.resolvedAt?.toISOString() ?? null,
    resolvedBy: db.resolvedBy,
    resolution: db.resolution,
    creatorId: db.creatorId,
    createdAt: db.createdAt.toISOString(),
  };
}

function mapDbRemoval(db: RemovalRecordModel): RemovalRecord {
  return {
    id: db.id,
    itemId: db.itemId,
    status: db.status as RemovalStatus,
    requestedBy: db.requestedBy,
    reason: db.reason,
    requestedAt: db.requestedAt.toISOString(),
    effectiveAt: db.effectiveAt?.toISOString() ?? null,
    completedAt: db.completedAt?.toISOString() ?? null,
    createdAt: db.createdAt.toISOString(),
  };
}

function mapDbSupersedingAssertion(
  db: SupersedingAssertionModel,
): SupersedingAssertion {
  return {
    id: db.id,
    targetItemId: db.targetItemId,
    replacesAssertionId: db.replacesAssertionId,
    correctedCreatorId: db.correctedCreatorId,
    correctedLicenseType: db.correctedLicenseType as LicenceId | null,
    rationale: db.rationale,
    recordedBy: db.recordedBy,
    recordedAt: db.recordedAt.toISOString(),
  };
}

function mapDbPatternSignal(db: PatternSignalModel): PatternSignalState {
  return {
    id: db.id,
    derivedFromItemIds: db.derivedFromItemIds,
    patternType: db.patternType,
    staleSince: db.staleSince?.toISOString() ?? null,
    eligibleItemCount: db.eligibleItemCount,
    distinctCreatorCount: db.distinctCreatorCount,
    rebuildState: db.rebuildState as RebuildState | null,
    createdAt: db.createdAt.toISOString(),
  };
}

// ─── ProvenanceRepositoryPrisma ─────────────────────────────────────────────

export class ProvenanceRepositoryPrisma implements ProvenanceRepository {
  // ── Creators (explicit canonicalization only — ADR-0003 D5) ──────────────

  async createCreator(input: NewCreatorInput): Promise<CreatorRecord> {
    const db = await prisma.creator.create({
      data: {
        name: input.name,
        url: input.url ?? null,
      },
    });
    return mapDbCreator(db);
  }

  async findCreatorById(id: string): Promise<CreatorRecord | null> {
    const db = await prisma.creator.findUnique({ where: { id } });
    return db ? mapDbCreator(db) : null;
  }

  // ── Source records ────────────────────────────────────────────────────────

  async createSourceRecord(input: NewSourceRecordInput): Promise<SourceRecord> {
    const db = await prisma.sourceRecord.create({
      data: {
        sourceUrl: input.sourceUrl,
        canonicalUrl: input.canonicalUrl,
        captureMode: input.captureMode,
        capturedAt: new Date(input.capturedAt),
        evidenceHash: input.evidenceHash ?? null,
        creatorId: input.creatorId ?? null,
      },
    });
    return mapDbSourceRecord(db);
  }

  async findSourceRecordByCanonicalUrl(
    canonicalUrl: string,
  ): Promise<SourceRecord | null> {
    const db = await prisma.sourceRecord.findUnique({
      where: { canonicalUrl },
    });
    return db ? mapDbSourceRecord(db) : null;
  }

  async findSourceRecordById(id: string): Promise<SourceRecord | null> {
    const db = await prisma.sourceRecord.findUnique({
      where: { id },
    });
    return db ? mapDbSourceRecord(db) : null;
  }

  // ── AI provenance (metadata-minimized — policy §6.2) ─────────────────────

  async createAiProvenance(input: NewAiProvenanceInput): Promise<AiProvenanceRecord> {
    const db = await prisma.aiProvenance.create({
      data: {
        provider: input.provider,
        modelName: input.modelName,
        generatedAt: new Date(input.generatedAt),
        disclosureStatus: input.disclosureStatus,
        promptHash: input.promptHash ?? null,
        outputHash: input.outputHash ?? null,
      },
    });
    return mapDbAiProvenance(db);
  }

  async findAiProvenanceById(id: string): Promise<AiProvenanceRecord | null> {
    const db = await prisma.aiProvenance.findUnique({ where: { id } });
    return db ? mapDbAiProvenance(db) : null;
  }

  // ── Ownership claims (policy §8.1) ────────────────────────────────────────

  async fileClaim(input: {
    itemId: string;
    claimantName: string;
    claimantContact: string;
    creatorId?: string | null;
  }): Promise<OwnershipClaimRecord> {
    const db = await prisma.ownershipClaim.create({
      data: {
        itemId: input.itemId,
        claimantName: input.claimantName,
        claimantContact: input.claimantContact,
        creatorId: input.creatorId ?? null,
      },
    });
    return mapDbOwnershipClaim(db);
  }

  async findClaimById(id: string): Promise<OwnershipClaimRecord | null> {
    const db = await prisma.ownershipClaim.findUnique({ where: { id } });
    return db ? mapDbOwnershipClaim(db) : null;
  }

  async resolveClaim(input: {
    claimId: string;
    decision: "ACCEPTED" | "REJECTED";
    resolvedBy: string;
    resolution: string;
  }): Promise<OwnershipClaimRecord> {
    // Guard: only PENDING/UNDER_REVIEW claims may be resolved (ADR-0003 D6).
    const updated = await prisma.ownershipClaim.updateMany({
      where: { id: input.claimId, status: { in: ["PENDING", "UNDER_REVIEW"] } },
      data: {
        status: input.decision,
        resolvedAt: new Date(),
        resolvedBy: input.resolvedBy,
        resolution: input.resolution,
      },
    });
    if (updated.count === 0) {
      throw new Error(
        `claim ${input.claimId} is not in a resolvable state (PENDING or UNDER_REVIEW required)`,
      );
    }
    const db = await prisma.ownershipClaim.findUnique({
      where: { id: input.claimId },
    });
    if (!db) {
      throw new Error(`claim ${input.claimId} not found after resolution`);
    }
    return mapDbOwnershipClaim(db);
  }

  // ── Removals (durable — policy §8.2, §9) ──────────────────────────────────

  async requestRemoval(input: {
    itemId: string;
    requestedBy: string;
    reason: string;
  }): Promise<RemovalRecord> {
    // Idempotency: reuse an existing active removal (REQUESTED/EFFECTIVE) so
    // concurrent identical invalidations produce ONE removal per item.
    const existing = await prisma.removalRecord.findFirst({
      where: { itemId: input.itemId, status: { in: ["REQUESTED", "EFFECTIVE"] } },
      orderBy: { requestedAt: "desc" },
    });
    if (existing) {
      return mapDbRemoval(existing);
    }
    const db = await prisma.removalRecord.create({
      data: {
        itemId: input.itemId,
        requestedBy: input.requestedBy,
        reason: input.reason,
      },
    });
    return mapDbRemoval(db);
  }

  async findRemovalById(id: string): Promise<RemovalRecord | null> {
    const db = await prisma.removalRecord.findUnique({ where: { id } });
    return db ? mapDbRemoval(db) : null;
  }

  async findActiveRemovalByItemId(itemId: string): Promise<RemovalRecord | null> {
    const db = await prisma.removalRecord.findFirst({
      where: { itemId, status: { in: ["REQUESTED", "EFFECTIVE"] } },
      orderBy: { requestedAt: "desc" },
    });
    return db ? mapDbRemoval(db) : null;
  }

  async markRemovalEffective(removalId: string): Promise<RemovalRecord> {
    // Guard: only REQUESTED removals become EFFECTIVE (policy §9).
    const updated = await prisma.removalRecord.updateMany({
      where: { id: removalId, status: "REQUESTED" },
      data: { status: "EFFECTIVE", effectiveAt: new Date() },
    });
    if (updated.count === 0) {
      throw new Error(
        `removal ${removalId} is not in REQUESTED state and cannot be marked effective`,
      );
    }
    const db = await prisma.removalRecord.findUnique({
      where: { id: removalId },
    });
    if (!db) {
      throw new Error(`removal ${removalId} not found after marking effective`);
    }
    return mapDbRemoval(db);
  }

  async markRemovalCompleted(removalId: string): Promise<RemovalRecord> {
    // Guard: only EFFECTIVE removals become COMPLETED (policy §9).
    const updated = await prisma.removalRecord.updateMany({
      where: { id: removalId, status: "EFFECTIVE" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new Error(
        `removal ${removalId} is not in EFFECTIVE state and cannot be marked completed`,
      );
    }
    const db = await prisma.removalRecord.findUnique({
      where: { id: removalId },
    });
    if (!db) {
      throw new Error(`removal ${removalId} not found after marking completed`);
    }
    return mapDbRemoval(db);
  }

  // ── Superseding assertions (attribution immutability — policy §7.2) ──────

  async recordSupersedingAssertion(
    input: SupersedeAttributionInput,
  ): Promise<SupersedingAssertion> {
    const db = await prisma.supersedingAssertion.create({
      data: {
        targetItemId: input.targetItemId,
        replacesAssertionId: input.replacesAssertionId,
        correctedCreatorId: input.correctedCreatorId ?? null,
        correctedLicenseType: input.correctedLicenseType ?? null,
        rationale: input.rationale,
        recordedBy: input.recordedBy,
        recordedAt: new Date(),
      },
    });
    return mapDbSupersedingAssertion(db);
  }

  async findLatestAssertionForItem(
    itemId: string,
  ): Promise<SupersedingAssertion | null> {
    const db = await prisma.supersedingAssertion.findFirst({
      where: { targetItemId: itemId },
      orderBy: { recordedAt: "desc" },
    });
    return db ? mapDbSupersedingAssertion(db) : null;
  }

  // ── Pattern signal eligibility / staleness / rebuild (policy §9) ──────────

  async findPatternSignalsReferencingItem(
    itemId: string,
  ): Promise<PatternSignalState[]> {
    const db = await prisma.patternSignal.findMany({
      where: { derivedFromItemIds: { has: itemId } },
      orderBy: { createdAt: "asc" },
    });
    return db.map(mapDbPatternSignal);
  }

  async markSignalStale(
    signalId: string,
    staleSince: string,
  ): Promise<PatternSignalState> {
    const staleDate = new Date(staleSince);
    // Idempotency: keep the earliest staleSince — a duplicate invalidation
    // must not shift the staleness timestamp or spawn a second rebuild target.
    const updated = await prisma.patternSignal.updateMany({
      where: {
        id: signalId,
        OR: [{ staleSince: null }, { staleSince: { gt: staleDate } }],
      },
      data: {
        staleSince: staleDate,
        rebuildState: "STALE_PENDING_REBUILD",
      },
    });
    if (updated.count === 0) {
      // Signal already stale at the same or earlier timestamp — return as-is.
      const existing = await prisma.patternSignal.findUnique({
        where: { id: signalId },
      });
      if (!existing) {
        throw new Error(`pattern signal ${signalId} not found`);
      }
      return mapDbPatternSignal(existing);
    }
    const db = await prisma.patternSignal.findUnique({ where: { id: signalId } });
    if (!db) {
      throw new Error(`pattern signal ${signalId} not found after marking stale`);
    }
    return mapDbPatternSignal(db);
  }

  async getSignalEligibility(
    signalId: string,
  ): Promise<{ eligibleItemCount: number; distinctCreatorCount: number } | null> {
    const db = await prisma.patternSignal.findUnique({
      where: { id: signalId },
      select: { eligibleItemCount: true, distinctCreatorCount: true },
    });
    if (!db) {
      return null;
    }
    // Not-yet-computed eligibility (null counts) is reported as null.
    if (db.eligibleItemCount === null || db.distinctCreatorCount === null) {
      return null;
    }
    return {
      eligibleItemCount: db.eligibleItemCount,
      distinctCreatorCount: db.distinctCreatorCount,
    };
  }

  async setSignalRebuildState(
    signalId: string,
    rebuildState: PatternSignalState["rebuildState"],
  ): Promise<PatternSignalState> {
    const updated = await prisma.patternSignal.updateMany({
      where: { id: signalId },
      data: { rebuildState },
    });
    if (updated.count === 0) {
      throw new Error(`pattern signal ${signalId} not found`);
    }
    const db = await prisma.patternSignal.findUnique({ where: { id: signalId } });
    if (!db) {
      throw new Error(`pattern signal ${signalId} not found after state change`);
    }
    return mapDbPatternSignal(db);
  }

  // ── Consent revocation (recorded on the original grant — ADR-0003 D3) ─────

  async revokeConsentForItem(
    itemId: string,
    _revokedBy: string,
  ): Promise<{ revokedAt: string }> {
    // The revoking actor is intentionally NOT persisted on the grant row —
    // policy §3.2 requires only revokedAt on ConsentRecord (ADR-0003 D3);
    // the actor is captured in the audit log by the service layer (T11).
    void _revokedBy;
    // Atomic invalidation: revoke consent AND mark all referencing pattern
    // signals stale in ONE transaction (ADR-0003 D8.2). A failure anywhere
    // rolls back everything — no orphan invalidation state.
    return prisma.$transaction(async (tx) => {
      const item = await tx.galleryItem.findUnique({
        where: { id: itemId },
        select: { consentRecordId: true },
      });
      if (!item) {
        throw new Error(`gallery item ${itemId} not found`);
      }

      // Idempotent: never overwrite an existing revokedAt (original grant row
      // is preserved — ADR-0003 D3).
      const consent = await tx.consentRecord.findUnique({
        where: { id: item.consentRecordId },
        select: { revokedAt: true },
      });
      if (!consent) {
        throw new Error(`consent record for item ${itemId} not found`);
      }
      const revokedAt = consent.revokedAt ?? new Date();
      if (!consent.revokedAt) {
        await tx.consentRecord.update({
          where: { id: item.consentRecordId },
          data: { revokedAt },
        });
      }

      // Mark all referencing signals stale (idempotent — earliest wins).
      const signals = await tx.patternSignal.findMany({
        where: { derivedFromItemIds: { has: itemId } },
        select: { id: true, staleSince: true },
      });
      for (const signal of signals) {
        if (!signal.staleSince || signal.staleSince > revokedAt) {
          await tx.patternSignal.updateMany({
            where: { id: signal.id },
            data: { staleSince: revokedAt, rebuildState: "STALE_PENDING_REBUILD" },
          });
        }
      }

      return { revokedAt: revokedAt.toISOString() };
    });
  }

  // NO update()/delete() for audit/removal history — durable by contract.
}
