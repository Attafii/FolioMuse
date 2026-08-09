// ─── CurationService Domain Logic ────────────────────────────────────────────────
// Implements the CurationService interface from ports.ts.
// Orchestrates GalleryRepository + AuditRepository (injected — NO Prisma imports).
// Enforces the editorial curation rubric (docs/product/curation-rubric.md)
// and originality rules R1–R8 (docs/product/originality-rules.md).

import { z } from "zod";

import type {
  AuditAction,
  CurationTelemetryEvent,
  GalleryItemSummary,
  IngestInput,
  OverrideDecisionInput,
  QualityLevel,
  ReviewDecisionInput,
  UpdateGalleryItemInput,
} from "./types";

import {
  AttributionSchema,
  ConsentRecordSchema,
  MediaUrlSchema,
  QualityLevelSchema,
  ComplianceStatusSchema,
  RejectionReasonSchema,
  CurationTelemetryEventSchema,
} from "./schemas";

import { PortfolioDetailSchema, type PortfolioDetail } from "./detail-schemas";
import {
  SectionDescriptorSchema,
  StrengthDescriptorSchema,
  StackEvidenceDescriptorSchema,
  type SectionDescriptor,
  type StrengthDescriptor,
  type StackEvidenceDescriptor,
} from "./detail-schemas";

import { derivePermissionResult } from "@/domain/provenance/schemas";
import { captureFreshnessLabel } from "@/lib/freshness";

import type {
  CurationService,
  GalleryRepository,
  AuditRepository,
} from "./ports";

import type {
  ProvenanceRebuildQueue,
  ProvenanceRepository,
} from "@/domain/provenance/ports";

// ─── Local Schemas ──────────────────────────────────────────────────────────────
// Composed schemas for input types that lack a dedicated export in schemas.ts.
// These reuse existing schema atoms and match the interface types in types.ts.

const IngestInputSchema = z.object({
  title: z.string().min(1, "title must not be empty"),
  creatorRole: z.string().min(1, "creatorRole must not be empty"),
  styleTags: z.array(z.string()),
  attribution: AttributionSchema,
  consent: ConsentRecordSchema,
  // Portfolio card system (T5): optional curated media + stack metadata.
  // mediaUrl validated HTTPS-only (MediaUrlSchema); stackTags bounded/trimmed.
  mediaUrl: MediaUrlSchema.optional(),
  stackTags: z
    .array(z.string().trim().min(1, "stack tag must not be empty").max(64, "stack tag must be at most 64 characters"))
    .max(10, "at most 10 stack tags are allowed")
    .optional(),
});

/**
 * ReviewDecisionInput carries itemId in its type contract (types.ts).
 * This schema validates the complete input at runtime, including itemId
 * presence (zod rejects empty/missing itemId before any write).
 */
const ReviewDecisionInputSchema = z.object({
  itemId: z.string().min(1, "itemId must not be empty"),
  decision: z.enum(["ACCEPT", "REJECT"]),
  qualityLevel: QualityLevelSchema,
  complianceStatus: ComplianceStatusSchema,
  rejectionReason: RejectionReasonSchema.nullable(),
  rationale: z.string().min(1, "rationale must not be empty"),
  reviewerId: z.string().min(1, "reviewerId must not be empty"),
});

const OverrideDecisionInputSchema = z.object({
  finalDecision: z.enum(["ACCEPT", "REJECT"]),
  qualityLevel: QualityLevelSchema,
  complianceStatus: ComplianceStatusSchema,
  rejectionReason: RejectionReasonSchema.nullable(),
  rationale: z.string().min(1, "rationale must not be empty"),
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Checks if a consent record has expired (null expiresAt means no expiry). */
function isConsentExpired(expiresAt: string | null): boolean {
  if (expiresAt === null) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

/** Quality level numeric mapping for comparison (L2 is the acceptance floor). */
const QUALITY_NUMERIC: Record<QualityLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

// ─── Implementation ────────────────────────────────────────────────────────────

export class CurationServiceImpl implements CurationService {
  constructor(
    private readonly galleryRepository: GalleryRepository,
    private readonly auditRepository: AuditRepository,
    private readonly provenanceRepository: ProvenanceRepository,
    private readonly rebuildQueue: ProvenanceRebuildQueue,
  ) {}

  // ── 1. ingest ─────────────────────────────────────────────────────────────────

  async ingest(input: IngestInput): Promise<GalleryItemSummary> {
    // Validate input structure
    const parsed = IngestInputSchema.parse(input);

    // Enforce attribution completeness (all 4 fields — R3 guard)
    const { attribution } = parsed;
    if (
      !attribution.creatorName ||
      !attribution.sourceUrl ||
      !attribution.licenseType ||
      !attribution.consentDate
    ) {
      throw new Error(
        "Ingest rejected: incomplete attribution. " +
          "All four fields (creatorName, sourceUrl, licenseType, consentDate) are required.",
      );
    }

    // Enforce consent validity
    const { consent } = parsed;
    const tierOrder: Record<string, number> = {
      DISPLAY: 1,
      PATTERN_DERIVE: 2,
      FULL: 3,
    };
    if (!consent.tier || (tierOrder[consent.tier] ?? 0) < tierOrder["DISPLAY"]) {
      throw new Error(
        `Ingest rejected: consent tier must be at least DISPLAY. ` +
          `Got "${consent.tier}".`,
      );
    }
    if (isConsentExpired(consent.expiresAt)) {
      throw new Error(
        `Ingest rejected: consent has expired. ` +
          `Expired at ${consent.expiresAt}.`,
      );
    }

    // Ingest through repository — passes real attribution + consent data.
    // The repository creates Attribution, ConsentRecord, and GalleryItem
    // rows in one $transaction and returns the full GalleryItem.
    const item = await this.galleryRepository.ingest({
      title: parsed.title,
      creatorRole: parsed.creatorRole,
      styleTags: parsed.styleTags,
      attribution: parsed.attribution,
      consent: parsed.consent,
      mediaUrl: parsed.mediaUrl ?? null,
      stackTags: parsed.stackTags ?? [],
    });

    // Create INGEST audit entry
    await this.auditRepository.create({
      action: "INGEST",
      actorId: consent.consentedBy,
      itemId: item.id,
      decision: null,
      rationale: "Ingested with valid attribution and consent",
    });

    // Emit telemetry
    this.emitTelemetry({
      action: "INGEST",
      itemId: item.id,
      actorId: consent.consentedBy,
      decision: null,
      rationale: "Ingested with valid attribution and consent",
      timestamp: new Date().toISOString(),
    });

    // Return summary (no content blob)
    const summary = await this.galleryRepository.findSummaryById(item.id);
    if (!summary) {
      throw new Error(
        `Ingest failed: could not find summary for newly ingested item ${item.id}`,
      );
    }
    return summary;
  }

  // ── 2. review ────────────────────────────────────────────────────────────────

  async review(decision: ReviewDecisionInput): Promise<GalleryItemSummary> {
    // Validate input (schema enforces itemId presence at runtime)
    const parsed = ReviewDecisionInputSchema.parse(decision);
    const { itemId, qualityLevel, complianceStatus, rationale, reviewerId } = parsed;

    let finalStatus: "ACCEPTED" | "REJECTED";
    let finalDecision: "ACCEPT" | "REJECT";
    let rejectReason: string | null = null;

    // Compliance gate — FAIL always rejects regardless of quality (R7)
    if (complianceStatus === "FAIL") {
      finalStatus = "REJECTED";
      finalDecision = "REJECT";
      rejectReason = "COMPLIANCE_FAIL";
    }
    // Quality threshold — below L2 always rejects
    else if (
      QUALITY_NUMERIC[qualityLevel] < QUALITY_NUMERIC["L2"]
    ) {
      finalStatus = "REJECTED";
      finalDecision = "REJECT";
      rejectReason = "QUALITY_BELOW_THRESHOLD";
    } else {
      finalStatus = "ACCEPTED";
      finalDecision = "ACCEPT";
    }

    // Update the item's quality, compliance, and status
    const updateInput: UpdateGalleryItemInput = {
      qualityLevel,
      complianceStatus,
    };
    await this.galleryRepository.update(itemId, updateInput);
    await this.galleryRepository.updateStatus(itemId, finalStatus);

    // Create REVIEW audit entry
    await this.auditRepository.create({
      action: "REVIEW",
      actorId: reviewerId,
      itemId,
      decision: null,
      rationale: `Review initiated by ${reviewerId}`,
    });

    // Create ACCEPT or REJECT audit entry
    const decisionAuditAction: AuditAction =
      finalDecision === "ACCEPT" ? "ACCEPT" : "REJECT";
    await this.auditRepository.create({
      action: decisionAuditAction,
      actorId: reviewerId,
      itemId,
      decision: finalDecision === "REJECT" ? rejectReason : "ACCEPT",
      rationale,
    });

    // Emit telemetry
    this.emitTelemetry({
      action: "REVIEW",
      itemId,
      actorId: reviewerId,
      decision: null,
      rationale: `Review initiated by ${reviewerId}`,
      timestamp: new Date().toISOString(),
    });

    // Return summary
    const summary = await this.galleryRepository.findSummaryById(itemId);
    if (!summary) {
      throw new Error(`Review failed: could not find summary for item ${itemId}`);
    }
    return summary;
  }

  // ── 3. escalate ──────────────────────────────────────────────────────────────

  async escalate(itemId: string, reason: string): Promise<void> {
    // Escalation is a workflow step — does not change item status.
    // The senior reviewer decides via overrideReview().

    await this.auditRepository.create({
      action: "ESCALATE",
      actorId: "system",
      itemId,
      decision: null,
      rationale: reason,
    });

    this.emitTelemetry({
      action: "ESCALATE",
      itemId,
      actorId: "system",
      decision: null,
      rationale: reason,
      timestamp: new Date().toISOString(),
    });
  }

  // ── 4. overrideReview ────────────────────────────────────────────────────────

  async overrideReview(
    itemId: string,
    overrideDecision: OverrideDecisionInput,
  ): Promise<GalleryItemSummary> {
    const parsed = OverrideDecisionInputSchema.parse(overrideDecision);
    const {
      finalDecision,
      qualityLevel,
      complianceStatus,
      rejectionReason,
      rationale,
    } = parsed;

    const newStatus = finalDecision === "ACCEPT" ? "ACCEPTED" : "REJECTED";

    // Update item
    const updateInput: UpdateGalleryItemInput = {
      qualityLevel,
      complianceStatus,
    };
    await this.galleryRepository.update(itemId, updateInput);
    await this.galleryRepository.updateStatus(itemId, newStatus);

    // OVERRIDE audit entry
    await this.auditRepository.create({
      action: "OVERRIDE",
      actorId: "senior-reviewer",
      itemId,
      decision:
        finalDecision === "REJECT" ? rejectionReason : "ACCEPT",
      rationale,
    });

    // Emit telemetry
    this.emitTelemetry({
      action: "OVERRIDE",
      itemId,
      actorId: "senior-reviewer",
      decision: finalDecision === "REJECT" ? rejectionReason : "ACCEPT",
      rationale,
      timestamp: new Date().toISOString(),
    });

    const summary = await this.galleryRepository.findSummaryById(itemId);
    if (!summary) {
      throw new Error(
        `Override review failed: could not find summary for item ${itemId}`,
      );
    }
    return summary;
  }

  // ── 5. archive ───────────────────────────────────────────────────────────────

  async archive(itemId: string, reason: string): Promise<GalleryItemSummary> {
    await this.galleryRepository.archive(itemId);

    await this.auditRepository.create({
      action: "ARCHIVE",
      actorId: "system",
      itemId,
      decision: null,
      rationale: reason,
    });

    this.emitTelemetry({
      action: "ARCHIVE",
      itemId,
      actorId: "system",
      decision: null,
      rationale: reason,
      timestamp: new Date().toISOString(),
    });

    const summary = await this.galleryRepository.findSummaryById(itemId);
    if (!summary) {
      throw new Error(
        `Archive failed: could not find summary for item ${itemId}`,
      );
    }
    return summary;
  }

  // ── 6. suspend ───────────────────────────────────────────────────────────────

  async suspend(itemId: string, reason: string): Promise<GalleryItemSummary> {
    await this.galleryRepository.suspend(itemId);

    await this.auditRepository.create({
      action: "SUSPEND",
      actorId: "system",
      itemId,
      decision: null,
      rationale: reason,
    });

    this.emitTelemetry({
      action: "SUSPEND",
      itemId,
      actorId: "system",
      decision: null,
      rationale: reason,
      timestamp: new Date().toISOString(),
    });

    const summary = await this.galleryRepository.findSummaryById(itemId);
    if (!summary) {
      throw new Error(
        `Suspend failed: could not find summary for item ${itemId}`,
      );
    }
    return summary;
  }

  // ── 7. flagDuplicate ─────────────────────────────────────────────────────────

  async flagDuplicate(
    itemId: string,
    duplicateOfId: string,
  ): Promise<GalleryItemSummary> {
    await this.galleryRepository.flagDuplicate(itemId, duplicateOfId);

    await this.auditRepository.create({
      action: "DUPLICATE_FLAG",
      actorId: "system",
      itemId,
      decision: duplicateOfId,
      rationale: `Flagged as duplicate of item ${duplicateOfId}`,
    });

    this.emitTelemetry({
      action: "DUPLICATE_FLAG",
      itemId,
      actorId: "system",
      decision: duplicateOfId,
      rationale: `Flagged as duplicate of item ${duplicateOfId}`,
      timestamp: new Date().toISOString(),
    });

    const summary = await this.galleryRepository.findSummaryById(itemId);
    if (!summary) {
      throw new Error(
        `Flag duplicate failed: could not find summary for item ${itemId}`,
      );
    }
    return summary;
  }

  // ── 8. triggerReReview ───────────────────────────────────────────────────────

  async triggerReReview(itemId: string): Promise<GalleryItemSummary> {
    await this.galleryRepository.updateStatus(itemId, "PENDING_REREVIEW");

    await this.auditRepository.create({
      action: "RE_REVIEW",
      actorId: "system",
      itemId,
      decision: null,
      rationale: "Re-review triggered",
    });

    this.emitTelemetry({
      action: "RE_REVIEW",
      itemId,
      actorId: "system",
      decision: null,
      rationale: "Re-review triggered",
      timestamp: new Date().toISOString(),
    });

    const summary = await this.galleryRepository.findSummaryById(itemId);
    if (!summary) {
      throw new Error(
        `Re-review failed: could not find summary for item ${itemId}`,
      );
    }
    return summary;
  }

  // ── 9. revokeConsent ─────────────────────────────────────────────────────────

  async revokeConsent(itemId: string): Promise<GalleryItemSummary> {
    // 1. Atomic provenance invalidation (policy §3.2, ADR-0003 D3/D8): records
    //    revokedAt on the ORIGINAL consent grant AND marks every derived
    //    PatternSignal stale in ONE repository transaction. A failure before
    //    this commit leaves the original active state untouched. The acting
    //    reviewer is captured as the audit actor below — it is intentionally
    //    NOT persisted on the ConsentRecord (policy §3.2).
    const { revokedAt } = await this.provenanceRepository.revokeConsentForItem(
      itemId,
      "system",
    );

    // 2. Archive the item (durable — R4, no deletion).
    await this.galleryRepository.archive(itemId);

    // 3. Audit history (append-only).
    await this.auditRepository.create({
      action: "CONSENT_REVOKE",
      actorId: "system",
      itemId,
      decision: null,
      rationale: "Creator consent revoked. Item archived per R4 (no deletion).",
    });

    // 4. Enqueue rebuild/drop decisions for every invalidated signal. Consent
    //    revocation carries no removal record, so itemId serves as the
    //    idempotency trigger key — duplicate revocations enqueue once per
    //    signal (policy §9.1). Runs AFTER the stale state commits.
    const signals =
      await this.provenanceRepository.findPatternSignalsReferencingItem(itemId);
    for (const signal of signals) {
      if (signal.staleSince) {
        await this.rebuildQueue.enqueueRebuild({
          removalId: itemId,
          signalId: signal.id,
          triggeredAt: revokedAt,
        });
      }
    }

    // 5. Telemetry — minimized, no private consent data (policy §12).
    this.emitTelemetry({
      action: "CONSENT_REVOKE",
      itemId,
      actorId: "system",
      decision: null,
      rationale: "Creator consent revoked. Item archived per R4.",
      timestamp: new Date().toISOString(),
    });

    const summary = await this.galleryRepository.findSummaryById(itemId);
    if (!summary) {
      throw new Error(
        `Consent revocation failed: could not find summary for item ${itemId}`,
      );
    }
    return summary;
  }

  // ── 10. emitTelemetry ────────────────────────────────────────────────────────

  emitTelemetry(event: CurationTelemetryEvent): void {
    try {
      const validated = CurationTelemetryEventSchema.parse(event);
      console.log("[telemetry]", JSON.stringify(validated));
    } catch {
      // Telemetry failure must never throw — it is a non-critical concern.
      // Silently discard the event if validation fails.
    }
  }

  // ── 11. listAccepted ─────────────────────────────────────────────────────────
  // Safe public read path for the gallery surface (plan T4 / ADR-0001).
  // Delegates to the repository — returns metadata-only summaries, no content
  // blob. Domain layer adds no extra filtering: the repository owns the
  // ACCEPTED + non-FLAG invariant.

  async listAccepted(): Promise<GalleryItemSummary[]> {
    return this.galleryRepository.listAccepted();
  }

  // ── 12. getAcceptedDetail ─────────────────────────────────────────────────
  // Safe detail read for /gallery/[id] (ADR-0007 T5). Public eligibility
  // guards (ACCEPTED, non-FLAG, consent not revoked, no active removal),
  // provenance enrichment from the provenance repository, superseding
  // attribution applied for display (history immutable), and strict safe DTO
  // validation before return. Similar examples are composed by the caller
  // (deterministic tag overlap, T6).

  async getAcceptedDetail(itemId: string): Promise<PortfolioDetail | null> {
    const record = await this.galleryRepository.findDetailById(itemId);
    if (!record) return null;

    // Eligibility guards (ADR-0007 D2).
    if (record.status !== "ACCEPTED") return null;
    if (record.complianceStatus === "FLAG") return null;
    if (record.consentRevokedAt !== null) return null;
    const removal = await this.provenanceRepository.findActiveRemovalByItemId(itemId);
    if (removal) return null;

    // Provenance enrichment (never raw captures / private data).
    const sourceRecord = record.sourceRecordId
      ? await this.provenanceRepository.findSourceRecordById(record.sourceRecordId)
      : null;
    const ai = record.aiProvenanceId
      ? await this.provenanceRepository.findAiProvenanceById(record.aiProvenanceId)
      : null;
    const assertion = await this.provenanceRepository.findLatestAssertionForItem(itemId);

    // Superseding attribution wins for display (policy §7.2); history immutable.
    const correctedCreator = assertion?.correctedCreatorId
      ? await this.provenanceRepository.findCreatorById(assertion.correctedCreatorId)
      : null;
    const displayCreator = correctedCreator ?? (sourceRecord?.creatorId
      ? await this.provenanceRepository.findCreatorById(sourceRecord.creatorId)
      : null);

    const licenceId = (assertion?.correctedLicenseType ?? record.attribution.licenseType) as Parameters<typeof derivePermissionResult>[0];
    const effectivePermission = derivePermissionResult(licenceId, record.consentTier);
    const capturedAt = sourceRecord?.capturedAt ?? null;

    // Curated descriptor columns are validated at read time; invalid rows
    // degrade to "not curated" (null) rather than failing the page.
    const sections = SectionDescriptorSchema.array().safeParse(record.sections).success
      ? (record.sections as unknown as SectionDescriptor[])
      : null;
    const strengths = StrengthDescriptorSchema.array().safeParse(record.strengths).success
      ? (record.strengths as unknown as StrengthDescriptor[])
      : null;
    const stackEvidence = StackEvidenceDescriptorSchema.array().safeParse(record.stackEvidence).success
      ? (record.stackEvidence as unknown as StackEvidenceDescriptor[])
      : null;

    const detail: PortfolioDetail = {
      id: record.id,
      title: record.title,
      creatorRole: record.creatorRole,
      styleTags: record.styleTags,
      qualityLevel: record.qualityLevel,
      complianceStatus: record.complianceStatus,
      status: record.status,
      attribution: record.attribution,
      consentTier: record.consentTier,
      reviewedAt: record.reviewedAt,
      duplicateOfId: record.duplicateOfId,
      mediaUrl: record.mediaUrl,
      stackTags: record.stackTags,
      provenance: {
        hasCreator: displayCreator !== null,
        hasSourceRecord: sourceRecord !== null,
        hasAiProvenance: ai !== null,
        hasConsent: true,
        aiDisclosure: ai?.disclosureStatus ?? "UNKNOWN",
        creator: displayCreator
          ? {
              id: displayCreator.id,
              name: displayCreator.name,
              verificationStatus: displayCreator.verificationStatus,
            }
          : null,
        licence: { id: licenceId, effectivePermission },
        source: sourceRecord
          ? {
              sourceUrl: sourceRecord.sourceUrl,
              canonicalUrl: sourceRecord.canonicalUrl,
              captureMode: sourceRecord.captureMode,
              capturedAt: sourceRecord.capturedAt,
            }
          : null,
        removalAvailable: true,
      },
      desktopMediaUrl: record.desktopMediaUrl,
      mobileMediaUrl: record.mobileMediaUrl,
      pageIndex: record.pageIndex,
      sections,
      strengths,
      stackEvidence,
      captureFreshness: {
        capturedAt,
        label: captureFreshnessLabel(capturedAt),
      },
      similarExamples: [],
    };

    // Strict safe DTO boundary (ADR-0007 D3): reject anything invalid rather
    // than leak it. Throwing here is a programmer error, not a user path.
    const parsed = PortfolioDetailSchema.parse(detail);
    return parsed;
  }
}
