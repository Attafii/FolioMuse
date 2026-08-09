// ─── GalleryRepository + AuditRepository Prisma Implementation ───────────────────
// Translates domain ports (src/domain/curation/ports.ts) into Prisma queries
// against the Neon-hosted PostgreSQL database.
//
// DESIGN NOTES:
//   - Prisma client singleton imported from src/lib/prisma.ts, which configures
//     the @prisma/adapter-neon driver adapter (Prisma 7 requirement).
//   - All Prisma Date/DateTime values are mapped to ISO 8601 strings in the
//     domain layer. No raw Date objects cross the repository boundary.
//   - qualityLevel and complianceStatus are nullable in the DB schema (no
//     defaults beyond null). Per the curation rubric §5.1, items entering
//     PENDING_REVIEW have had "no quality or compliance assessment occurred."
//     For domain integrity (non-nullable union types), null DB values are
//     mapped to "L0" (unassessed) and "FLAG" (unreviewed) respectively.
//     After a review decision is applied, these columns will hold explicit
//     values, so the null fallback only fires for pre-review items.
//
// R3 ATTRIBUTION GUARD:
//   GalleryRepositoryPrisma.update() inspects every key in the input object.
//   Only the fields declared in UpdateGalleryItemInput (title, creatorRole,
//   styleTags, duplicateOfId, qualityLevel, complianceStatus, status,
//   reviewedAt) are allowed. Any other key — including attributionId,
//   creatorName, sourceUrl, licenseType, consentDate, consent, or any
//   unrecognized field — triggers an AttributionModificationError.
//   Attribution is immutable per originality rule R3.
//
// ANTI-CLONING / ADR-0001 COMPLIANCE:
//   - NO delete() method on either repository class (items are never deleted).
//   - NO update() or delete() on AuditRepositoryPrisma (audit is append-only).
//   - NO method that exports contentBlob or structureJSON (no full content
//     export per ADR-0001).
//   - findSummaryById() returns GalleryItemSummary (metadata + attribution
//     only), never the full GalleryItem entity.
// ────────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import type {
  Attribution as AttributionModel,
  ConsentRecord as ConsentRecordModel,
  GalleryItem as GalleryItemModel,
  AuditEntry as AuditEntryModel,
} from "@/generated/prisma/client";

import type {
  Attribution,
  AuditAction,
  AuditEntry,
  ComplianceStatus,
  ConsentRecord,
  ConsentTier,
  ConsentTerms,
  GalleryDetailRecord,
  GalleryItem,
  GalleryItemSummary,
  ItemStatus,
  NewAuditEntryInput,
  NewGalleryItemInput,
  QualityLevel,
  UpdateGalleryItemInput,
} from "@/domain/curation/types";
import { AttributionModificationError } from "@/domain/curation/types";
import type { GalleryRepository, AuditRepository } from "@/domain/curation/ports";

// ─── DB → Domain Mappers ────────────────────────────────────────────────────────
// All Prisma DateTime columns are converted to ISO 8601 strings.
// Nullable qualityLevel/complianceStatus → "L0" / "FLAG" (documented above).

function mapDbAttribution(db: AttributionModel): Attribution {
  return {
    creatorName: db.creatorName,
    sourceUrl: db.sourceUrl,
    licenseType: db.licenseType as ConsentTerms,
    consentDate: db.consentDate.toISOString(),
  };
}

function mapDbConsent(db: ConsentRecordModel): ConsentRecord {
  return {
    tier: db.tier as ConsentTier,
    consentedBy: db.consentedBy,
    consentedAt: db.consentedAt.toISOString(),
    terms: db.terms as ConsentTerms,
    expiresAt: db.expiresAt?.toISOString() ?? null,
  };
}

/** Full GalleryItem entity including nested attribution + consent. */
function mapDbGalleryItem(
  db: GalleryItemModel & {
    attribution: AttributionModel;
    consent: ConsentRecordModel;
  },
): GalleryItem {
  return {
    id: db.id,
    title: db.title,
    creatorRole: db.creatorRole,
    styleTags: db.styleTags,
    qualityLevel: (db.qualityLevel ?? "L0") as QualityLevel,
    complianceStatus: (db.complianceStatus ?? "FLAG") as ComplianceStatus,
    status: db.status as ItemStatus,
    attributionId: db.attributionId,
    consentRecordId: db.consentRecordId,
    attribution: mapDbAttribution(db.attribution),
    consent: mapDbConsent(db.consent),
    reviewedAt: db.reviewedAt?.toISOString() ?? null,
    duplicateOfId: db.duplicateOfId,
    structureFingerprint: db.structureFingerprint,
    contentHash: db.contentHash,
    mediaUrl: db.mediaUrl,
    stackTags: db.stackTags,
    createdAt: db.createdAt.toISOString(),
    updatedAt: db.updatedAt.toISOString(),
  };
}

/** GalleryItemSummary — metadata only, no content fields, per ADR-0001. */
function mapDbToSummary(
  db: GalleryItemModel & {
    attribution: AttributionModel;
    consent: ConsentRecordModel;
  },
): GalleryItemSummary {
  return {
    id: db.id,
    title: db.title,
    creatorRole: db.creatorRole,
    styleTags: db.styleTags,
    qualityLevel: (db.qualityLevel ?? "L0") as QualityLevel,
    complianceStatus: (db.complianceStatus ?? "FLAG") as ComplianceStatus,
    status: db.status as ItemStatus,
    attribution: mapDbAttribution(db.attribution),
    consentTier: db.consent.tier as ConsentTier,
    reviewedAt: db.reviewedAt?.toISOString() ?? null,
    duplicateOfId: db.duplicateOfId,
    mediaUrl: db.mediaUrl,
    stackTags: db.stackTags,
  };
}

function mapDbAuditEntry(db: AuditEntryModel): AuditEntry {
  return {
    id: db.id,
    action: db.action as AuditAction,
    actorId: db.actorId,
    itemId: db.itemId,
    decision: db.decision,
    rationale: db.rationale,
    timestamp: db.timestamp.toISOString(),
  };
}

// ─── Query helpers ──────────────────────────────────────────────────────────────

/** Shared include that fetches attribution + consent relations with every query. */
const GALLERY_ITEM_INCLUDE = {
  attribution: true,
  consent: true,
} as const;

/**
 * Fields allowed in UpdateGalleryItemInput. Any key outside this set
 * in an update call triggers an AttributionModificationError (R3 guard).
 */
const ALLOWED_UPDATE_FIELDS = new Set<string>([
  "title",
  "creatorRole",
  "styleTags",
  "duplicateOfId",
  "qualityLevel",
  "complianceStatus",
  "status",
  "reviewedAt",
  // Portfolio card system (ADR-0006): curated metadata is editable;
  // attribution fields remain forbidden (R3 guard).
  "mediaUrl",
  "stackTags",
]);

// ─── GalleryRepositoryPrisma ────────────────────────────────────────────────────

export class GalleryRepositoryPrisma implements GalleryRepository {
  async ingest(input: NewGalleryItemInput): Promise<GalleryItem> {
    const dbItem = await prisma.$transaction(async (tx) => {
      // 1. Create the Attribution row from domain data
      const attribution = await tx.attribution.create({
        data: {
          creatorName: input.attribution.creatorName,
          sourceUrl: input.attribution.sourceUrl,
          licenseType: input.attribution.licenseType,
          consentDate: new Date(input.attribution.consentDate),
        },
      });

      // 2. Create the ConsentRecord row from domain data
      const consent = await tx.consentRecord.create({
        data: {
          tier: input.consent.tier,
          consentedBy: input.consent.consentedBy,
          consentedAt: new Date(input.consent.consentedAt),
          terms: input.consent.terms,
          expiresAt: input.consent.expiresAt
            ? new Date(input.consent.expiresAt)
            : null,
        },
      });

      // 3. Create the GalleryItem with FK references
      return tx.galleryItem.create({
        data: {
          title: input.title,
          creatorRole: input.creatorRole,
          styleTags: input.styleTags,
          mediaUrl: input.mediaUrl ?? null,
          stackTags: input.stackTags ?? [],
          attributionId: attribution.id,
          consentRecordId: consent.id,
          status: "PENDING_REVIEW",
        },
        include: GALLERY_ITEM_INCLUDE,
      });
    });

    return mapDbGalleryItem(dbItem);
  }

  async findById(id: string): Promise<GalleryItem | null> {
    const dbItem = await prisma.galleryItem.findUnique({
      where: { id },
      include: GALLERY_ITEM_INCLUDE,
    });

    return dbItem ? mapDbGalleryItem(dbItem) : null;
  }

  async findSummaryById(id: string): Promise<GalleryItemSummary | null> {
    const dbItem = await prisma.galleryItem.findUnique({
      where: { id },
      include: GALLERY_ITEM_INCLUDE,
    });

    return dbItem ? mapDbToSummary(dbItem) : null;
  }

  async findDetailById(id: string): Promise<GalleryDetailRecord | null> {
    const dbItem = await prisma.galleryItem.findUnique({
      where: { id },
      include: GALLERY_ITEM_INCLUDE,
    });
    if (!dbItem) return null;

    return {
      id: dbItem.id,
      title: dbItem.title,
      creatorRole: dbItem.creatorRole,
      styleTags: dbItem.styleTags,
      qualityLevel: (dbItem.qualityLevel ?? "L0") as QualityLevel,
      complianceStatus: (dbItem.complianceStatus ?? "FLAG") as ComplianceStatus,
      status: dbItem.status as ItemStatus,
      attribution: mapDbAttribution(dbItem.attribution),
      consentTier: dbItem.consent.tier as ConsentTier,
      consentRevokedAt: dbItem.consent.revokedAt?.toISOString() ?? null,
      reviewedAt: dbItem.reviewedAt?.toISOString() ?? null,
      duplicateOfId: dbItem.duplicateOfId,
      mediaUrl: dbItem.mediaUrl,
      stackTags: dbItem.stackTags,
      desktopMediaUrl: dbItem.desktopMediaUrl,
      mobileMediaUrl: dbItem.mobileMediaUrl,
      pageIndex: dbItem.pageIndex,
      sections: dbItem.sections,
      strengths: dbItem.strengths,
      stackEvidence: dbItem.stackEvidence,
      sourceRecordId: dbItem.sourceRecordId,
      aiProvenanceId: dbItem.aiProvenanceId,
    };
  }

  async update(
    id: string,
    input: UpdateGalleryItemInput,
  ): Promise<GalleryItem> {
    // R3 guard: reject any attribution-related field modifications.
    const providedKeys = Object.keys(input).filter(
      (k) => input[k as keyof UpdateGalleryItemInput] !== undefined,
    );
    const forbiddenKeys = providedKeys.filter(
      (k) => !ALLOWED_UPDATE_FIELDS.has(k),
    );

    if (forbiddenKeys.length > 0) {
      throw new AttributionModificationError(id, forbiddenKeys);
    }

    const dbItem = await prisma.galleryItem.update({
      where: { id },
      data: input,
      include: GALLERY_ITEM_INCLUDE,
    });

    return mapDbGalleryItem(dbItem);
  }

  async updateStatus(id: string, status: ItemStatus): Promise<GalleryItem> {
    const dbItem = await prisma.galleryItem.update({
      where: { id },
      data: { status },
      include: GALLERY_ITEM_INCLUDE,
    });

    return mapDbGalleryItem(dbItem);
  }

  async flagDuplicate(
    id: string,
    duplicateOfId: string,
  ): Promise<GalleryItem> {
    const dbItem = await prisma.galleryItem.update({
      where: { id },
      data: { duplicateOfId },
      include: GALLERY_ITEM_INCLUDE,
    });

    return mapDbGalleryItem(dbItem);
  }

  async archive(id: string): Promise<GalleryItem> {
    const dbItem = await prisma.galleryItem.update({
      where: { id },
      data: { status: "ARCHIVED" },
      include: GALLERY_ITEM_INCLUDE,
    });

    return mapDbGalleryItem(dbItem);
  }

  async suspend(id: string): Promise<GalleryItem> {
    const dbItem = await prisma.galleryItem.update({
      where: { id },
      data: { status: "SUSPENDED" },
      include: GALLERY_ITEM_INCLUDE,
    });

    return mapDbGalleryItem(dbItem);
  }

  /**
   * Lists accepted gallery item summaries for the public gallery surface.
   * Filtering (per plan T3 / ADR-0001):
   *   - status === "ACCEPTED"
   *   - complianceStatus !== "FLAG" — flagged or unreviewed (NULL, which the
   *     domain maps to "FLAG") items never surface publicly.
   * Ordering: qualityLevel DESC (L3 first), then reviewedAt DESC (newest
   * review first). Nulls sort last. Returns metadata only — no content blob.
   */
  async listAccepted(): Promise<GalleryItemSummary[]> {
    const dbItems = await prisma.galleryItem.findMany({
      where: {
        status: "ACCEPTED",
        complianceStatus: { not: "FLAG" },
      },
      orderBy: [
        { qualityLevel: { sort: "desc", nulls: "last" } },
        { reviewedAt: { sort: "desc", nulls: "last" } },
      ],
      include: GALLERY_ITEM_INCLUDE,
    });

    return dbItems.map(mapDbToSummary);
  }
}

// ─── AuditRepositoryPrisma ─────────────────────────────────────────────────────

export class AuditRepositoryPrisma implements AuditRepository {
  async create(entry: NewAuditEntryInput): Promise<AuditEntry> {
    const dbEntry = await prisma.auditEntry.create({
      data: {
        action: entry.action,
        actorId: entry.actorId,
        itemId: entry.itemId,
        decision: entry.decision ?? null,
        rationale: entry.rationale ?? null,
      },
    });

    return mapDbAuditEntry(dbEntry);
  }

  async findByItemId(itemId: string): Promise<AuditEntry[]> {
    const dbEntries = await prisma.auditEntry.findMany({
      where: { itemId },
      orderBy: { timestamp: "asc" },
    });

    return dbEntries.map(mapDbAuditEntry);
  }
}
