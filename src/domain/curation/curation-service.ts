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
  QualityLevelSchema,
  ComplianceStatusSchema,
  RejectionReasonSchema,
  CurationTelemetryEventSchema,
} from "./schemas";

import type {
  CurationService,
  GalleryRepository,
  AuditRepository,
} from "./ports";

// ─── Local Schemas ──────────────────────────────────────────────────────────────
// Composed schemas for input types that lack a dedicated export in schemas.ts.
// These reuse existing schema atoms and match the interface types in types.ts.

const IngestInputSchema = z.object({
  title: z.string().min(1, "title must not be empty"),
  creatorRole: z.string().min(1, "creatorRole must not be empty"),
  styleTags: z.array(z.string()),
  attribution: AttributionSchema,
  consent: ConsentRecordSchema,
});

/**
 * ReviewDecisionInput with itemId — ReviewDecisionInput (types.ts) omits
 * itemId, but the review workflow requires it. This schema enforces
 * itemId at runtime through zod validation.
 */
const ReviewDecisionInputWithItemIdSchema = z.object({
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
    const parsed = ReviewDecisionInputWithItemIdSchema.parse(decision);
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
    // Pattern-signal staleness (PatternSignal.staleSince) not set here:
    // requires a future repository method (markPatternSignalsStale).
    // Tracked in .sisyphus/notepads/editorial-curation-rubric/issues.md.
    await this.galleryRepository.archive(itemId);

    await this.auditRepository.create({
      action: "CONSENT_REVOKE",
      actorId: "system",
      itemId,
      decision: null,
      rationale: "Creator consent revoked. Item archived per R4 (no deletion).",
    });

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
}
