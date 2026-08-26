// â”€â”€â”€ Port Interfaces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Framework-agnostic domain interfaces. Implementations live in src/persistence/
// and MUST NOT be imported by UI code (AGENTS.md Â§7).
// NO Prisma imports â€” these are pure TypeScript interfaces.

import type {
  GalleryQuery,
} from "@/lib/gallery-query";
import type {
  AuditEntry,
  CurationTelemetryEvent,
  GalleryDetailRecord,
  GalleryItem,
  GalleryItemSummary,
  IngestInput,
  ItemStatus,
  NewAuditEntryInput,
  NewGalleryItemInput,
  OverrideDecisionInput,
  ReviewDecisionInput,
  UpdateGalleryItemInput,
} from "./types";

// â”€â”€â”€ GalleryRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GalleryRepository {
  /** Creates a new gallery item in PENDING_REVIEW status. */
  ingest(item: NewGalleryItemInput): Promise<GalleryItem>;

  /** Finds a gallery item by id. Returns the full entity (internal use only). */
  findById(id: string): Promise<GalleryItem | null>;

  /**
   * Finds a gallery item summary (metadata + attribution only).
   * This is the safe read method â€” NO content blob per ADR-0001.
   */
  findSummaryById(id: string): Promise<GalleryItemSummary | null>;

  /**
   * Finds the internal gallery detail record for /gallery/[id] (ADR-0007).
   * Service-layer only: carries provenance linkage + consent revocation guard
   * for the accepted-detail service. NEVER exposed by a public API/UI.
   */
  findDetailById(id: string): Promise<GalleryDetailRecord | null>;

  /**
   * Updates a gallery item's mutable fields.
   * MUST throw AttributionModificationError if input attempts to modify
   * attribution fields (R3 guard).
   */
  update(id: string, input: UpdateGalleryItemInput): Promise<GalleryItem>;

  /** Updates only the status field. */
  updateStatus(id: string, status: ItemStatus): Promise<GalleryItem>;

  /** Flags an item as a duplicate of another. */
  flagDuplicate(id: string, duplicateOfId: string): Promise<GalleryItem>;

  /** Archives an item (sets status to ARCHIVED). */
  archive(id: string): Promise<GalleryItem>;

  /** Suspends an item (sets status to SUSPENDED). */
  suspend(id: string): Promise<GalleryItem>;

  /**
   * Lists accepted gallery item summaries (safe projection â€” NO content blob
   * per ADR-0001). Returns only status === "ACCEPTED" items, ordered
   * qualityLevel DESC, reviewedAt DESC. Compliance-flagged items are excluded.
   */
  listAccepted(): Promise<GalleryItemSummary[]>;

  /**
   * Server-side filtered + paginated variant of listAccepted (LCP fix):
   * executes the shared gallery query with skip/take and returns one page
   * plus total count. Same safe projection as listAccepted.
   */
  listAcceptedFiltered(
    query: GalleryQuery,
  ): Promise<{ items: GalleryItemSummary[]; total: number }>;

  /** Facet counts for filter UIs, computed server-side (no item payloads). */
  getPublicFacets(): Promise<{
    total: number;
    roles: { value: string; count: number }[];
    styles: { value: string; count: number }[];
    stacks: { value: string; count: number }[];
    qualities: { value: string; count: number }[];
    consents: { value: string; count: number }[];
  }>;

  // NO delete() â€” deletion is forbidden per curation-rubric.
  // NO findFullContentById() â€” no exportable content blob per ADR-0001.
}

// â”€â”€â”€ AuditRepository â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AuditRepository {
  /** Creates a new audit entry (append-only). */
  create(entry: NewAuditEntryInput): Promise<AuditEntry>;

  /** Retrieves all audit entries for a given gallery item. */
  findByItemId(itemId: string): Promise<AuditEntry[]>;

  // NO update() â€” audit entries are immutable.
  // NO delete() â€” audit entries are never deleted.
}

// â”€â”€â”€ CurationService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CurationService {
  /**
   * Validates consent + attribution, then ingests a new item.
   * Throws if consent is missing or attribution is incomplete.
   */
  ingest(input: IngestInput): Promise<GalleryItemSummary>;

  /**
   * Applies a review decision. Enforces:
   * - compliance=FAIL â†’ reject regardless of quality
   * - quality < L2 â†’ reject
   * Logs an audit entry.
   */
  review(decision: ReviewDecisionInput): Promise<GalleryItemSummary>;

  /** Escalates an item to a senior reviewer. Logs an audit entry. */
  escalate(itemId: string, reason: string): Promise<void>;

  /**
   * Senior reviewer binding override. Logs an OVERRIDE audit entry.
   * The override decision is final.
   */
  overrideReview(
    itemId: string,
    overrideDecision: OverrideDecisionInput,
  ): Promise<GalleryItemSummary>;

  /**
   * Archives an item (stale content / consent revocation).
   * Logs an audit entry.
   */
  archive(itemId: string, reason: string): Promise<GalleryItemSummary>;

  /**
   * Emergency takedown. Sets status to SUSPENDED immediately.
   * Logs an audit entry. Full review must follow within 48h.
   */
  suspend(itemId: string, reason: string): Promise<GalleryItemSummary>;

  /** Flags an item as a duplicate of another. Logs an audit entry. */
  flagDuplicate(
    itemId: string,
    duplicateOfId: string,
  ): Promise<GalleryItemSummary>;

  /**
   * Sets status to PENDING_REREVIEW (creator-initiated update).
   * Logs an audit entry.
   */
  triggerReReview(itemId: string): Promise<GalleryItemSummary>;

  /**
   * Revokes creator consent: archives item + marks pattern signals stale.
   * Logs an audit entry. No deletion per R4.
   */
  revokeConsent(itemId: string): Promise<GalleryItemSummary>;

  /** Emits a structured telemetry event. */
  emitTelemetry(event: CurationTelemetryEvent): void;

  /**
   * Lists accepted gallery item summaries (safe projection â€” NO content blob
   * per ADR-0001/ADR-0002). Returns only status === "ACCEPTED" items, ordered
   * qualityLevel DESC, reviewedAt DESC. Compliance-flagged items are excluded.
   */
  listAccepted(): Promise<GalleryItemSummary[]>;

  /** Server-side filtered + paginated read (LCP fix). Same safe projection. */
  listAcceptedFiltered(
    query: GalleryQuery,
  ): Promise<{ items: GalleryItemSummary[]; total: number }>;

  /** Facet counts for filter UIs, computed server-side (no item payloads). */
  getPublicFacets(): Promise<{
    total: number;
    roles: { value: string; count: number }[];
    styles: { value: string; count: number }[];
    stacks: { value: string; count: number }[];
    qualities: { value: string; count: number }[];
    consents: { value: string; count: number }[];
  }>;

  /**
   * Returns the safe detail projection for /gallery/[id] (ADR-0007 T5) or
   * null when the record is not publicly eligible (missing, non-ACCEPTED,
   * FLAG, archived, suspended, rejected, revoked consent, active removal).
   * Enriched with provenance; never raw content or private data.
   */
  getAcceptedDetail(itemId: string): Promise<import("./detail-schemas").PortfolioDetail | null>;
}
