// ─── Integration Tests for GalleryRepositoryPrisma + AuditRepositoryPrisma ───
// Requires a real Neon database connection (DATABASE_URL env var).
// Tests SKIP gracefully when DATABASE_URL is missing so npm test stays green
// in environments without database credentials.
//
// Each test creates and cleans up its own data using unique prefixes to
// avoid collisions. Cleanup runs in FK order: auditEntries → reviewDecisions
// → galleryItems → consentRecords → attributions.
//
// ADR-0001 compliance: no delete() on GalleryRepository, no update/delete
// on AuditRepository, no content blob export via findSummaryById.
// ───────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { AttributionModificationError } from "@/domain/curation/types";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import type {
  NewGalleryItemInput,
  NewAuditEntryInput,
  GalleryItem,
  GalleryItemSummary,
} from "@/domain/curation/types";

// ─── Conditional suite: skip entire block when no database ──────────────────

describe.skipIf(!process.env.DATABASE_URL)(
  "GalleryRepositoryPrisma integration",
  () => {
    // ─── State tracking for cleanup ────────────────────────────────────────

    let createdItemIds: string[] = [];
    let createdAttributionIds: string[] = [];
    let createdConsentIds: string[] = [];
    let createdSignalIds: string[] = [];
    let testRunSuffix: string;

    // ─── Repositories ──────────────────────────────────────────────────────

    const repo = new GalleryRepositoryPrisma();
    const auditRepo = new AuditRepositoryPrisma();
    const provenanceRepo = new ProvenanceRepositoryPrisma();

    // ─── Helpers ───────────────────────────────────────────────────────────

    /** Build a unique NewGalleryItemInput for test isolation. */
    function makeIngestInput(
      n: number,
      overrides?: Partial<{
        title: string;
        sourceUrl: string;
        creatorName: string;
        styleTags: string[];
        consentTier: "DISPLAY" | "PATTERN_DERIVE" | "FULL";
        consentExpiresAt: string | null;
      }>,
    ): NewGalleryItemInput {
      const suffix = `-${testRunSuffix}-${n}`;
      const sourceUrl = overrides?.sourceUrl ?? `https://test.example.com/portfolio${suffix}`;
      return {
        title: overrides?.title ?? `Test Portfolio ${suffix}`,
        creatorRole: "Frontend Developer",
        styleTags: overrides?.styleTags ?? ["minimal", "editorial"],
        attribution: {
          creatorName: overrides?.creatorName ?? `Test Creator ${suffix}`,
          sourceUrl,
          licenseType: "EXPLICIT_PERMISSION",
          consentDate: new Date().toISOString(),
        },
        consent: {
          tier: overrides?.consentTier ?? "DISPLAY",
          consentedBy: `test-integration-actor${suffix}`,
          consentedAt: new Date().toISOString(),
          terms: "EXPLICIT_PERMISSION",
          expiresAt: overrides?.consentExpiresAt ?? null,
        },
      };
    }

    /** Register a successfully ingested item for cleanup. */
    function trackIngestResult(result: GalleryItem) {
      createdItemIds.push(result.id);
      createdAttributionIds.push(result.attributionId);
      createdConsentIds.push(result.consentRecordId);
    }

    // ─── Lifecycle ─────────────────────────────────────────────────────────

    beforeAll(async () => {
      // Verify the database is reachable.
      await prisma.$queryRaw`SELECT 1`;
      testRunSuffix = `${Date.now()}`;
    });

    afterEach(async () => {
      // Cleanup in FK dependency order:
      // AuditEntry → ReviewDecision → GalleryItem → ConsentRecord → Attribution
      if (createdItemIds.length > 0) {
        await prisma.auditEntry.deleteMany({
          where: { itemId: { in: createdItemIds } },
        });
        await prisma.reviewDecision.deleteMany({
          where: { itemId: { in: createdItemIds } },
        });
        await prisma.galleryItem.deleteMany({
          where: { id: { in: createdItemIds } },
        });
      }
      if (createdConsentIds.length > 0) {
        await prisma.consentRecord.deleteMany({
          where: { id: { in: createdConsentIds } },
        });
      }
      if (createdAttributionIds.length > 0) {
        await prisma.attribution.deleteMany({
          where: { id: { in: createdAttributionIds } },
        });
      }
      if (createdSignalIds.length > 0) {
        await prisma.patternSignal.deleteMany({
          where: { id: { in: createdSignalIds } },
        });
      }
      // Reset tracking arrays for the next test.
      createdItemIds = [];
      createdAttributionIds = [];
      createdConsentIds = [];
      createdSignalIds = [];
    });

    afterAll(async () => {
      // Safety net: cleanup any remaining data by unique prefix.
      await prisma.auditEntry.deleteMany({
        where: { actorId: { startsWith: "test-integration-actor" } },
      });
      await prisma.galleryItem.deleteMany({
        where: { title: { startsWith: "Test Portfolio -" } },
      });
      await prisma.consentRecord.deleteMany({
        where: { consentedBy: { startsWith: "test-integration-actor" } },
      });
      await prisma.attribution.deleteMany({
        where: { creatorName: { startsWith: "Test Creator -" } },
      });
      await prisma.patternSignal.deleteMany({
        where: { patternType: { startsWith: "T11_SIGNAL" } },
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 1: Ingest creates Attribution + ConsentRecord + GalleryItem
    //             in one transaction. Verify all 3 rows exist. Verify
    //             rollback on unique sourceUrl collision.
    // ═══════════════════════════════════════════════════════════════════════

    it("creates Attribution, ConsentRecord, and GalleryItem in one transaction", async () => {
      const input = makeIngestInput(1);

      const result = await repo.ingest(input);
      trackIngestResult(result);

      // All 3 IDs must be present and non-empty.
      expect(result.id).toBeTruthy();
      expect(result.attributionId).toBeTruthy();
      expect(result.consentRecordId).toBeTruthy();

      // Verify GalleryItem row exists via direct Prisma query.
      const dbItem = await prisma.galleryItem.findUnique({
        where: { id: result.id },
      });
      expect(dbItem).not.toBeNull();
      expect(dbItem!.title).toBe(input.title);

      // Verify Attribution row exists.
      const dbAttr = await prisma.attribution.findUnique({
        where: { id: result.attributionId },
      });
      expect(dbAttr).not.toBeNull();
      expect(dbAttr!.creatorName).toBe(input.attribution.creatorName);

      // Verify ConsentRecord row exists.
      const dbConsent = await prisma.consentRecord.findUnique({
        where: { id: result.consentRecordId },
      });
      expect(dbConsent).not.toBeNull();
      expect(dbConsent!.tier).toBe(input.consent.tier);
    });

    it("rolls back entire transaction on unique sourceUrl collision", async () => {
      const sourceUrl = `https://test.example.com/duplicate-${testRunSuffix}-2`;
      const firstInput = makeIngestInput(2, { sourceUrl });
      const secondInput = makeIngestInput(3, { sourceUrl });

      // First ingest must succeed.
      const first = await repo.ingest(firstInput);
      trackIngestResult(first);

      // Second ingest with same sourceUrl must fail.
      await expect(repo.ingest(secondInput)).rejects.toThrow();

      // Verify only ONE attribution with this sourceUrl exists.
      const count = await prisma.attribution.count({
        where: { sourceUrl },
      });
      expect(count).toBe(1);

      // Verify no gallery item was created for the failed attempt
      // (title from the second input should not exist).
      const orphanedItem = await prisma.galleryItem.findFirst({
        where: { title: secondInput.title },
      });
      expect(orphanedItem).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 2: findById returns full entity with nested attribution
    //             and consent.
    // ═══════════════════════════════════════════════════════════════════════

    it("returns full entity with nested attribution and consent from findById", async () => {
      const input = makeIngestInput(4);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      const found = await repo.findById(ingested.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(ingested.id);
      expect(found!.title).toBe(input.title);

      // Attribution must be fully populated.
      expect(found!.attribution).toBeDefined();
      expect(found!.attribution.creatorName).toBe(input.attribution.creatorName);
      expect(found!.attribution.sourceUrl).toBe(input.attribution.sourceUrl);
      expect(found!.attribution.licenseType).toBe(input.attribution.licenseType);
      expect(found!.attribution.consentDate).toBeTruthy();

      // Consent must be fully populated.
      expect(found!.consent).toBeDefined();
      expect(found!.consent.tier).toBe(input.consent.tier);
      expect(found!.consent.consentedBy).toBe(input.consent.consentedBy);
      expect(found!.consent.consentedAt).toBeTruthy();
      expect(found!.consent.terms).toBe(input.consent.terms);

      // Full entity should include content-related fields (null placeholders).
      expect(found!.structureFingerprint).toBe(null);
      expect(found!.contentHash).toBe(null);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 3: findSummaryById returns GalleryItemSummary WITHOUT
    //             content fields (no contentBlob/structureJSON).
    // ═══════════════════════════════════════════════════════════════════════

    it("returns summary without content blob fields from findSummaryById", async () => {
      const input = makeIngestInput(5);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      const summary = await repo.findSummaryById(ingested.id);

      expect(summary).not.toBeNull();
      expect(summary!.id).toBe(ingested.id);

      // Verify content-related fields are NOT present.
      const summaryObj = summary as GalleryItemSummary & Record<string, unknown>;
      expect(summaryObj).not.toHaveProperty("contentBlob");
      expect(summaryObj).not.toHaveProperty("structureJSON");
      expect(summaryObj).not.toHaveProperty("structureFingerprint");
      expect(summaryObj).not.toHaveProperty("contentHash");

      // Verify metadata fields ARE present.
      expect(summary!.title).toBe(input.title);
      expect(summary!.attribution).toBeDefined();
      expect(summary!.consentTier).toBe(input.consent.tier);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 3b (plan portfolio-card-system T5): media/stack projection.
    // ingest() with curated metadata returns it in findSummaryById, legacy
    // rows default to null/[], and update() allows metadata edits while
    // attribution stays immutable.
    // ═══════════════════════════════════════════════════════════════════════

    it("round-trips mediaUrl and stackTags through ingest and summary projection", async () => {
      const input = makeIngestInput(55, {
        title: "Card Media Projection",
      });
      const ingested = await repo.ingest({
        ...input,
        mediaUrl: "https://cdn.example.com/card.webp",
        stackTags: ["React", "Next.js"],
      });
      trackIngestResult(ingested);

      const summary = await repo.findSummaryById(ingested.id);
      expect(summary).not.toBeNull();
      expect(summary!.mediaUrl).toBe("https://cdn.example.com/card.webp");
      expect(summary!.stackTags).toEqual(["React", "Next.js"]);
      // Safe projection: content fields never present.
      const summaryObj = summary as GalleryItemSummary & Record<string, unknown>;
      expect(summaryObj).not.toHaveProperty("contentBlob");
      expect(summaryObj).not.toHaveProperty("structureJSON");
    });

    it("defaults legacy items to mediaUrl null and stackTags []", async () => {
      const input = makeIngestInput(56);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      const summary = await repo.findSummaryById(ingested.id);
      expect(summary).not.toBeNull();
      expect(summary!.mediaUrl).toBeNull();
      expect(summary!.stackTags).toEqual([]);
    });

    it("allows curating mediaUrl and stackTags via update while guarding attribution", async () => {
      const input = makeIngestInput(57);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      const updated = await repo.update(ingested.id, {
        mediaUrl: "https://cdn.example.com/updated.webp",
        stackTags: ["TypeScript"],
      });
      expect(updated.mediaUrl).toBe("https://cdn.example.com/updated.webp");
      expect(updated.stackTags).toEqual(["TypeScript"]);

      // Attribution remains immutable (R3).
      // @ts-expect-error sourceUrl is not in UpdateGalleryItemInput
      await expect(repo.update(ingested.id, { sourceUrl: "https://evil.com" })).rejects.toThrow(
        AttributionModificationError,
      );
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 4: update with attribution modification throws
    //             AttributionModificationError.
    // ═══════════════════════════════════════════════════════════════════════

    it("throws AttributionModificationError when updating attributionId", async () => {
      const input = makeIngestInput(6);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      // @ts-expect-error attributionId is not in UpdateGalleryItemInput
      await expect(repo.update(ingested.id, { attributionId: "fake-id" })).rejects.toThrow(
        AttributionModificationError,
      );
    });

    it("throws AttributionModificationError when updating creatorName", async () => {
      const input = makeIngestInput(7);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      // @ts-expect-error creatorName is not in UpdateGalleryItemInput
      await expect(repo.update(ingested.id, { creatorName: "Hacker" })).rejects.toThrow(
        AttributionModificationError,
      );
    });

    it("throws AttributionModificationError when updating sourceUrl", async () => {
      const input = makeIngestInput(8);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      // @ts-expect-error sourceUrl is not in UpdateGalleryItemInput
      await expect(repo.update(ingested.id, { sourceUrl: "https://evil.com" })).rejects.toThrow(
        AttributionModificationError,
      );
    });

    it("throws AttributionModificationError when updating consentDate", async () => {
      const input = makeIngestInput(9);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      // @ts-expect-error consentDate is not in UpdateGalleryItemInput
      await expect(repo.update(ingested.id, { consentDate: "2020-01-01T00:00:00Z" })).rejects.toThrow(
        AttributionModificationError,
      );
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 5: updateStatus transitions through all statuses.
    // ═══════════════════════════════════════════════════════════════════════

    it("transitions from PENDING_REVIEW to ACCEPTED", async () => {
      const input = makeIngestInput(10);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      expect(ingested.status).toBe("PENDING_REVIEW");

      const updated = await repo.updateStatus(ingested.id, "ACCEPTED");
      expect(updated.status).toBe("ACCEPTED");
    });

    it("transitions from ACCEPTED to PENDING_REREVIEW", async () => {
      const input = makeIngestInput(11);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      await repo.updateStatus(ingested.id, "ACCEPTED");
      const updated = await repo.updateStatus(ingested.id, "PENDING_REREVIEW");
      expect(updated.status).toBe("PENDING_REREVIEW");
    });

    it("transitions to ARCHIVED", async () => {
      const input = makeIngestInput(12);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      const updated = await repo.updateStatus(ingested.id, "ARCHIVED");
      expect(updated.status).toBe("ARCHIVED");
    });

    it("transitions to SUSPENDED", async () => {
      const input = makeIngestInput(13);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      const updated = await repo.updateStatus(ingested.id, "SUSPENDED");
      expect(updated.status).toBe("SUSPENDED");
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 6: flagDuplicate sets duplicateOfId.
    // ═══════════════════════════════════════════════════════════════════════

    it("sets duplicateOfId via flagDuplicate", async () => {
      const first = await repo.ingest(makeIngestInput(14));
      const second = await repo.ingest(makeIngestInput(15));
      trackIngestResult(first);
      trackIngestResult(second);

      // Initially both should have null duplicateOfId.
      expect(first.duplicateOfId).toBeNull();
      expect(second.duplicateOfId).toBeNull();

      // Flag second as duplicate of first.
      const flagged = await repo.flagDuplicate(second.id, first.id);
      expect(flagged.duplicateOfId).toBe(first.id);
      expect(flagged.id).toBe(second.id);

      // Verify via direct DB query.
      const dbItem = await prisma.galleryItem.findUnique({
        where: { id: second.id },
      });
      expect(dbItem!.duplicateOfId).toBe(first.id);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 7: archive and suspend status changes.
    // ═══════════════════════════════════════════════════════════════════════

    it("archive sets status to ARCHIVED", async () => {
      const input = makeIngestInput(16);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      expect(ingested.status).toBe("PENDING_REVIEW");

      const archived = await repo.archive(ingested.id);
      expect(archived.status).toBe("ARCHIVED");
      expect(archived.id).toBe(ingested.id);
    });

    it("suspend sets status to SUSPENDED", async () => {
      const input = makeIngestInput(17);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      expect(ingested.status).toBe("PENDING_REVIEW");

      const suspended = await repo.suspend(ingested.id);
      expect(suspended.status).toBe("SUSPENDED");
      expect(suspended.id).toBe(ingested.id);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 7b: listAccepted returns only ACCEPTED, non-FLAG items,
    // ordered qualityLevel DESC then reviewedAt DESC (plan T3).
    // ═══════════════════════════════════════════════════════════════════════

    it("listAccepted returns only ACCEPTED non-flagged items ordered by quality then recency", async () => {
      // ── Fixture set ────────────────────────────────────────────────────
      // L3 accepted (oldest review) — must be FIRST (highest quality).
      const l3 = await repo.ingest(makeIngestInput(30));
      trackIngestResult(l3);
      await repo.update(l3.id, {
        status: "ACCEPTED",
        qualityLevel: "L3",
        complianceStatus: "PASS",
        reviewedAt: "2026-07-01T00:00:00.000Z",
      });

      // L2 accepted (newest review) — must be SECOND.
      const l2 = await repo.ingest(makeIngestInput(31));
      trackIngestResult(l2);
      await repo.update(l2.id, {
        status: "ACCEPTED",
        qualityLevel: "L2",
        complianceStatus: "PASS",
        reviewedAt: "2026-07-10T00:00:00.000Z",
      });

      // L2 accepted (older review) — must be THIRD (same quality, older).
      const l2old = await repo.ingest(makeIngestInput(32));
      trackIngestResult(l2old);
      await repo.update(l2old.id, {
        status: "ACCEPTED",
        qualityLevel: "L2",
        complianceStatus: "PASS",
        reviewedAt: "2026-07-05T00:00:00.000Z",
      });

      // ACCEPTED but FLAG-flagged — must be EXCLUDED.
      const flagged = await repo.ingest(makeIngestInput(33));
      trackIngestResult(flagged);
      await repo.update(flagged.id, {
        status: "ACCEPTED",
        qualityLevel: "L3",
        complianceStatus: "FLAG",
        reviewedAt: "2026-07-02T00:00:00.000Z",
      });

      // Still PENDING_REVIEW — must be EXCLUDED.
      const pending = await repo.ingest(makeIngestInput(34));
      trackIngestResult(pending);

      // SUSPENDED with high quality — must be EXCLUDED.
      const suspendedAccepted = await repo.ingest(makeIngestInput(35));
      trackIngestResult(suspendedAccepted);
      await repo.update(suspendedAccepted.id, {
        status: "SUSPENDED",
        qualityLevel: "L3",
        complianceStatus: "PASS",
      });

      // ── Assertions ─────────────────────────────────────────────────────
      const accepted = await repo.listAccepted();

      const ids = accepted.map((s) => s.id);
      expect(ids).not.toContain(flagged.id);
      expect(ids).not.toContain(pending.id);
      expect(ids).not.toContain(suspendedAccepted.id);

      // Ordering: L3 first, then L2 by recency (newest reviewedAt first).
      expect(ids).toEqual([l3.id, l2.id, l2old.id]);

      // Return type is summary — never carries a content blob (ADR-0001).
      const first = accepted[0];
      expect(first).toMatchObject({
        id: l3.id,
        title: expect.any(String),
        creatorRole: expect.any(String),
        status: "ACCEPTED",
        qualityLevel: "L3",
      });
      expect(first).not.toHaveProperty("contentBlob");
      expect(first).not.toHaveProperty("structureJSON");
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 8: AuditRepository.create + findByItemId.
    // ═══════════════════════════════════════════════════════════════════════

    it("creates audit entries and retrieves them in timestamp order", async () => {
      const input = makeIngestInput(18);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      // Create 3 audit entries.
      const entry1Input: NewAuditEntryInput = {
        action: "INGEST",
        actorId: "test-integration-actor-18-1",
        itemId: ingested.id,
        decision: "INITIATED",
        rationale: "Initial ingestion",
      };
      const entry2Input: NewAuditEntryInput = {
        action: "REVIEW",
        actorId: "test-integration-actor-18-2",
        itemId: ingested.id,
        decision: "ACCEPT",
        rationale: "Passed review",
      };
      const entry3Input: NewAuditEntryInput = {
        action: "ACCEPT",
        actorId: "test-integration-actor-18-3",
        itemId: ingested.id,
        decision: null,
        rationale: null,
      };

      const entry1 = await auditRepo.create(entry1Input);
      const entry2 = await auditRepo.create(entry2Input);
      const entry3 = await auditRepo.create(entry3Input);

      // All entries must have valid IDs.
      expect(entry1.id).toBeTruthy();
      expect(entry2.id).toBeTruthy();
      expect(entry3.id).toBeTruthy();

      // Retrieve by itemId — must return all 3 in timestamp order.
      const entries = await auditRepo.findByItemId(ingested.id);
      expect(entries).toHaveLength(3);

      // Verify order: asc by timestamp.
      expect(new Date(entries[0].timestamp).getTime()).toBeLessThanOrEqual(
        new Date(entries[1].timestamp).getTime(),
      );
      expect(new Date(entries[1].timestamp).getTime()).toBeLessThanOrEqual(
        new Date(entries[2].timestamp).getTime(),
      );

      // Verify content of each entry.
      expect(entries[0].action).toBe("INGEST");
      expect(entries[1].action).toBe("REVIEW");
      expect(entries[2].action).toBe("ACCEPT");

      expect(entries[1].decision).toBe("ACCEPT");
      expect(entries[1].rationale).toBe("Passed review");

      expect(entries[2].decision).toBeNull();
      expect(entries[2].rationale).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 9: AuditRepository has NO update/delete (append-only).
    //             Verified via compile-time @ts-expect-error assertions.
    // ═══════════════════════════════════════════════════════════════════════

    it("has no update method on AuditRepository", () => {
      // @ts-expect-error AuditRepository interface has no update method — append-only
      const hasNoUpdate = auditRepo.update;
      // If this line executes without compile error, someone added update to the interface.
      expect(hasNoUpdate).toBeUndefined();
    });

    it("has no delete method on AuditRepository", () => {
      // @ts-expect-error AuditRepository interface has no delete method — append-only
      const hasNoDelete = auditRepo.delete;
      expect(hasNoDelete).toBeUndefined();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 10: No delete method on GalleryRepository.
    //              Verified via compile-time @ts-expect-error assertion.
    // ═══════════════════════════════════════════════════════════════════════

    it("has no delete method on GalleryRepository", () => {
      // @ts-expect-error GalleryRepository interface has no delete method — deletion is forbidden
      const hasNoDelete = repo.delete;
      expect(hasNoDelete).toBeUndefined();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 11 (T11 seam): consent revocation is atomic across the
    //             provenance + gallery repositories. Records revokedAt on the
    //             ORIGINAL grant, marks referencing PatternSignals stale, and
    //             archives the item. Failure before the transaction commit
    //             leaves the original active state untouched.
    // ═══════════════════════════════════════════════════════════════════════

    it("revocation records revokedAt, marks referencing signals stale, and archives the item", async () => {
      const input = makeIngestInput(19);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      // A derived pattern signal references the item.
      const signal = await prisma.patternSignal.create({
        data: {
          derivedFromItemIds: [ingested.id],
          patternType: "T11_SIGNAL_EDITORIAL_HERO",
          staleSince: null,
          eligibleItemCount: 3,
          distinctCreatorCount: 2,
          rebuildState: null,
        },
      });
      createdSignalIds.push(signal.id);

      // The orchestration the curation service performs (T11 seam).
      const { revokedAt } = await provenanceRepo.revokeConsentForItem(
        ingested.id,
        "test-integration-actor",
      );
      const archived = await repo.archive(ingested.id);

      // revokedAt recorded on the ORIGINAL grant row.
      const dbConsent = await prisma.consentRecord.findUnique({
        where: { id: ingested.consentRecordId },
      });
      expect(dbConsent!.revokedAt).not.toBeNull();
      expect(dbConsent!.revokedAt!.toISOString()).toBe(revokedAt);

      // Signal marked stale with rebuild state pending.
      const dbSignal = await prisma.patternSignal.findUnique({
        where: { id: signal.id },
      });
      expect(dbSignal!.staleSince).not.toBeNull();
      expect(dbSignal!.rebuildState).toBe("STALE_PENDING_REBUILD");

      // Item archived (durable — no deletion).
      expect(archived.status).toBe("ARCHIVED");
    });

    it("failure before transaction commit leaves the original active state untouched", async () => {
      const input = makeIngestInput(20);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      // A signal referencing the item exists before the failed revocation.
      const signal = await prisma.patternSignal.create({
        data: {
          derivedFromItemIds: [ingested.id],
          patternType: "T11_SIGNAL_EDITORIAL_HERO",
          staleSince: null,
          eligibleItemCount: 3,
          distinctCreatorCount: 2,
          rebuildState: null,
        },
      });
      createdSignalIds.push(signal.id);

      // revokeConsentForItem on a NON-EXISTENT item fails inside the
      // transaction → the whole invalidation rolls back (no partial state).
      await expect(
        provenanceRepo.revokeConsentForItem(
          "nonexistent-item-t11",
          "system",
        ),
      ).rejects.toThrow(/not found/);

      // Original grant still has no revokedAt.
      const dbConsent = await prisma.consentRecord.findUnique({
        where: { id: ingested.consentRecordId },
      });
      expect(dbConsent!.revokedAt).toBeNull();

      // The referencing signal is untouched (not stale).
      const dbSignal = await prisma.patternSignal.findUnique({
        where: { id: signal.id },
      });
      expect(dbSignal!.staleSince).toBeNull();
      expect(dbSignal!.rebuildState).toBeNull();
    });

    it("duplicate revocation is idempotent — revokedAt never overwritten", async () => {
      const input = makeIngestInput(21);
      const ingested = await repo.ingest(input);
      trackIngestResult(ingested);

      const first = await provenanceRepo.revokeConsentForItem(
        ingested.id,
        "system",
      );
      const second = await provenanceRepo.revokeConsentForItem(
        ingested.id,
        "system",
      );

      expect(second.revokedAt).toBe(first.revokedAt);

      // Consent row carries a single revokedAt.
      const dbConsent = await prisma.consentRecord.findUnique({
        where: { id: ingested.consentRecordId },
      });
      expect(dbConsent!.revokedAt!.toISOString()).toBe(first.revokedAt);
    });
  },
);
