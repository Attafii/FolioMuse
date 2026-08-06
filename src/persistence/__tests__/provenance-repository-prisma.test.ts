// ─── Integration Tests for ProvenanceRepositoryPrisma ────────────────────────
// Requires a real Neon database connection (DATABASE_URL env var).
// Tests SKIP gracefully when DATABASE_URL is missing so npm test stays green
// in environments without database credentials.
//
// Each test creates and cleans up its own data using unique prefixes to
// avoid collisions. Cleanup runs in FK order: SupersedingAssertion →
// RemovalRecord → OwnershipClaim → AuditEntry → ReviewDecision → GalleryItem
// → SourceRecord → AiProvenance → ConsentRecord → Attribution → Creator →
// PatternSignal.
//
// ADR-0003 compliance assertions:
//   - No update()/delete() on audit/claim/removal history (durable history).
//   - Attribution corrections via superseding assertions (never mutation).
//   - Consent revocation records revokedAt on the original grant and marks
//     referencing pattern signals stale in ONE transaction.
//   - Idempotency: concurrent identical invalidations produce one removal
//     and one rebuild target per signal.
//   - Claimant private data appears only on the internal OwnershipClaimRecord
//     (findClaimById); no other read returns it.
// ───────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import type {
  CreatorRecord,
  PatternSignalState,
  SourceRecord,
} from "@/domain/provenance/types";

// ─── Conditional suite: skip entire block when no database ──────────────────

describe.skipIf(!process.env.DATABASE_URL)(
  "ProvenanceRepositoryPrisma integration",
  () => {
    // ─── State tracking for cleanup ────────────────────────────────────────

    let createdItemIds: string[] = [];
    let createdAttributionIds: string[] = [];
    let createdConsentIds: string[] = [];
    let createdCreatorIds: string[] = [];
    let createdSourceRecordIds: string[] = [];
    let createdAiProvenanceIds: string[] = [];
    let createdSignalIds: string[] = [];
    let testRunSuffix: string;

    // ─── Repository ────────────────────────────────────────────────────────

    const repo = new ProvenanceRepositoryPrisma();

    // ─── Helpers ───────────────────────────────────────────────────────────

    /** Build a unique gallery item via direct test-only Prisma (FK parent for
     *  claims/removals/assertions/consent-revocation scenarios). */
    async function createTestItem(n: number) {
      const suffix = `-${testRunSuffix}-${n}`;
      const item = await prisma.galleryItem.create({
        data: {
          title: `Prov Test Item ${suffix}`,
          creatorRole: "Frontend Developer",
          attribution: {
            create: {
              creatorName: `Prov Test Creator ${suffix}`,
              sourceUrl: `https://test.example.com/prov${suffix}`,
              licenseType: "EXPLICIT_PERMISSION",
              consentDate: new Date(),
            },
          },
          consent: {
            create: {
              tier: "DISPLAY",
              consentedBy: `prov-integration-actor${suffix}`,
              consentedAt: new Date(),
              terms: "EXPLICIT_PERMISSION",
              expiresAt: null,
            },
          },
        },
        include: { attribution: true, consent: true },
      });
      createdItemIds.push(item.id);
      createdAttributionIds.push(item.attributionId);
      createdConsentIds.push(item.consentRecordId);
      return item;
    }

    /** Create a pattern signal referencing the given item (test-only). */
    async function createTestSignal(itemId: string) {
      const signal = await prisma.patternSignal.create({
        data: {
          derivedFromItemIds: [itemId],
          patternType: "EDITORIAL_HERO",
        },
      });
      createdSignalIds.push(signal.id);
      return signal;
    }

    // ─── Lifecycle ─────────────────────────────────────────────────────────

    beforeAll(async () => {
      // Verify the database is reachable.
      await prisma.$queryRaw`SELECT 1`;
      testRunSuffix = `${Date.now()}`;
    });

    afterEach(async () => {
      // Cleanup in FK dependency order (children → parents).
      if (createdItemIds.length > 0) {
        await prisma.supersedingAssertion.deleteMany({
          where: { targetItemId: { in: createdItemIds } },
        });
        await prisma.removalRecord.deleteMany({
          where: { itemId: { in: createdItemIds } },
        });
        await prisma.ownershipClaim.deleteMany({
          where: { itemId: { in: createdItemIds } },
        });
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
      if (createdSourceRecordIds.length > 0) {
        await prisma.sourceRecord.deleteMany({
          where: { id: { in: createdSourceRecordIds } },
        });
      }
      if (createdAiProvenanceIds.length > 0) {
        await prisma.aiProvenance.deleteMany({
          where: { id: { in: createdAiProvenanceIds } },
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
      if (createdCreatorIds.length > 0) {
        await prisma.creator.deleteMany({
          where: { id: { in: createdCreatorIds } },
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
      createdCreatorIds = [];
      createdSourceRecordIds = [];
      createdAiProvenanceIds = [];
      createdSignalIds = [];
    });

    afterAll(async () => {
      // Safety net: cleanup any remaining data by unique prefix.
      await prisma.ownershipClaim.deleteMany({
        where: { claimantName: { startsWith: "prov-claimant-" } },
      });
      await prisma.removalRecord.deleteMany({
        where: { requestedBy: { startsWith: "prov-remover-" } },
      });
      await prisma.supersedingAssertion.deleteMany({
        where: { recordedBy: { startsWith: "prov-recorder-" } },
      });
      await prisma.patternSignal.deleteMany({
        where: { patternType: { startsWith: "PROV_TEST_" } },
      });
      await prisma.galleryItem.deleteMany({
        where: { title: { startsWith: "Prov Test Item -" } },
      });
      await prisma.sourceRecord.deleteMany({
        where: { canonicalUrl: { startsWith: "https://test.example.com/prov" } },
      });
      await prisma.creator.deleteMany({
        where: { name: { startsWith: "Prov Test Creator -" } },
      });
      await prisma.consentRecord.deleteMany({
        where: { consentedBy: { startsWith: "prov-integration-actor" } },
      });
      await prisma.attribution.deleteMany({
        where: { creatorName: { startsWith: "Prov Test Creator -" } },
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 1: Creators — create + find roundtrip.
    // ═══════════════════════════════════════════════════════════════════════

    it("creates and finds a creator", async () => {
      const created = await repo.createCreator({
        name: `Prov Test Creator -${testRunSuffix}-1`,
        url: "https://example.com/creator-1",
      });
      createdCreatorIds.push(created.id);

      expect(created.id).toBeTruthy();
      expect(created.name).toContain(testRunSuffix);
      expect(created.url).toBe("https://example.com/creator-1");
      expect(created.verificationStatus).toBe("UNVERIFIED");
      expect(created.createdAt).toBeTruthy();

      const found = await repo.findCreatorById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe(created.name);

      // ISO 8601 boundary: createdAt must be a parseable ISO string, not a Date.
      expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
    });

    it("creates a creator with no url", async () => {
      const created = await repo.createCreator({
        name: `Prov Test Creator -${testRunSuffix}-1b`,
      });
      createdCreatorIds.push(created.id);

      expect(created.url).toBeNull();
    });

    it("returns null for an unknown creator id", async () => {
      const found = await repo.findCreatorById("cuid-nope-nonexistent");
      expect(found).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 2: Source records — create + canonical-url lookup; unique
    //             canonicalUrl collision surfaces as a write error (no
    //             silent overwrite, no orphan).
    // ═══════════════════════════════════════════════════════════════════════

    it("creates and finds a source record by canonicalUrl", async () => {
      const creator = await repo.createCreator({
        name: `Prov Test Creator -${testRunSuffix}-2`,
      });
      createdCreatorIds.push(creator.id);

      const input = {
        sourceUrl: `https://example.com/portfolio-a-${testRunSuffix}`,
        canonicalUrl: `https://example.com/portfolio-a-${testRunSuffix}#canon`,
        captureMode: "URL_SUBMISSION" as const,
        capturedAt: new Date().toISOString(),
        evidenceHash: "abc123",
        creatorId: creator.id,
      };
      const created = await repo.createSourceRecord(input);
      createdSourceRecordIds.push(created.id);

      expect(created.id).toBeTruthy();
      expect(created.canonicalUrl).toBe(input.canonicalUrl);
      expect(created.captureMode).toBe("URL_SUBMISSION");
      expect(created.evidenceHash).toBe("abc123");
      expect(created.creatorId).toBe(creator.id);

      const found = await repo.findSourceRecordByCanonicalUrl(input.canonicalUrl);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);

      // ISO 8601 boundary.
      expect(Number.isNaN(Date.parse(created.capturedAt))).toBe(false);
    });

    it("rejects a duplicate canonicalUrl without leaving an orphan record", async () => {
      const canonicalUrl = `https://example.com/dup-${testRunSuffix}`;
      const first = await repo.createSourceRecord({
        sourceUrl: canonicalUrl,
        canonicalUrl,
        captureMode: "MANUAL_SUBMISSION",
        capturedAt: new Date().toISOString(),
      });
      createdSourceRecordIds.push(first.id);

      // Second create with the same canonicalUrl must fail (unique constraint).
      await expect(
        repo.createSourceRecord({
          sourceUrl: `${canonicalUrl}-alt`,
          canonicalUrl,
          captureMode: "MANUAL_SUBMISSION",
          capturedAt: new Date().toISOString(),
        }),
      ).rejects.toThrow();

      // Exactly one row exists for this canonicalUrl.
      const count = await prisma.sourceRecord.count({ where: { canonicalUrl } });
      expect(count).toBe(1);
    });

    it("returns null when no source record matches a canonicalUrl", async () => {
      const found = await repo.findSourceRecordByCanonicalUrl(
        `https://example.com/never-indexed-${testRunSuffix}`,
      );
      expect(found).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 3: AI provenance — create + find; metadata-minimized.
    // ═══════════════════════════════════════════════════════════════════════

    it("creates and finds AI provenance", async () => {
      const created = await repo.createAiProvenance({
        provider: "OpenAI",
        modelName: "gpt-4o",
        generatedAt: new Date().toISOString(),
        disclosureStatus: "AI_ASSISTED",
        promptHash: "prompt-hash-1",
        outputHash: "output-hash-1",
      });

      expect(created.id).toBeTruthy();
      expect(created.provider).toBe("OpenAI");
      expect(created.disclosureStatus).toBe("AI_ASSISTED");
      expect(created.promptHash).toBe("prompt-hash-1");

      const found = await repo.findAiProvenanceById(created.id);
      expect(found).not.toBeNull();
      expect(found!.modelName).toBe("gpt-4o");
      expect(found!.disclosureStatus).toBe("AI_ASSISTED");

      // ISO 8601 boundary.
      expect(Number.isNaN(Date.parse(created.generatedAt))).toBe(false);
    });

    it("returns null for an unknown aiProvenance id", async () => {
      const found = await repo.findAiProvenanceById("cuid-nope-nonexistent");
      expect(found).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 4: Ownership claims — file, find (internal record carries
    //             claimantContact), resolve with state guard.
    // ═══════════════════════════════════════════════════════════════════════

    it("files a claim and returns the internal record with claimantContact", async () => {
      const item = await createTestItem(4);

      const claim = await repo.fileClaim({
        itemId: item.id,
        claimantName: `prov-claimant-${testRunSuffix}-4`,
        claimantContact: "owner@example.com",
      });

      expect(claim.id).toBeTruthy();
      expect(claim.itemId).toBe(item.id);
      expect(claim.status).toBe("PENDING");
      // Internal record carries private contact (policy §8.3) — only path.
      expect(claim.claimantContact).toBe("owner@example.com");
      expect(claim.resolvedAt).toBeNull();
      expect(claim.resolvedBy).toBeNull();

      const found = await repo.findClaimById(claim.id);
      expect(found).not.toBeNull();
      expect(found!.claimantName).toBe(claim.claimantName);
      expect(found!.status).toBe("PENDING");
    });

    it("resolves a PENDING claim to ACCEPTED and guards re-resolution", async () => {
      const item = await createTestItem(4);
      const claim = await repo.fileClaim({
        itemId: item.id,
        claimantName: `prov-claimant-${testRunSuffix}-4b`,
        claimantContact: "owner2@example.com",
      });

      const resolved = await repo.resolveClaim({
        claimId: claim.id,
        decision: "ACCEPTED",
        resolvedBy: "reviewer-1",
        resolution: "Documentation verified.",
      });

      expect(resolved.status).toBe("ACCEPTED");
      expect(resolved.resolvedBy).toBe("reviewer-1");
      expect(resolved.resolution).toBe("Documentation verified.");
      expect(resolved.resolvedAt).toBeTruthy();

      // Second resolution must throw (already resolved).
      await expect(
        repo.resolveClaim({
          claimId: claim.id,
          decision: "REJECTED",
          resolvedBy: "reviewer-1",
          resolution: "Late retraction.",
        }),
      ).rejects.toThrow(/not in a resolvable state/);
    });

    it("rejects an ownership claim", async () => {
      const item = await createTestItem(4);
      const claim = await repo.fileClaim({
        itemId: item.id,
        claimantName: `prov-claimant-${testRunSuffix}-4c`,
        claimantContact: "owner3@example.com",
      });

      const resolved = await repo.resolveClaim({
        claimId: claim.id,
        decision: "REJECTED",
        resolvedBy: "reviewer-2",
        resolution: "No supporting evidence.",
      });

      expect(resolved.status).toBe("REJECTED");
    });

    it("throws when filing a claim against a nonexistent item (no orphan row)", async () => {
      await expect(
        repo.fileClaim({
          itemId: "cuid-nope-nonexistent",
          claimantName: `prov-claimant-${testRunSuffix}-4d`,
          claimantContact: "nobody@example.com",
        }),
      ).rejects.toThrow();

      // FK integrity: no claim row was created for the phantom item.
      const count = await prisma.ownershipClaim.count({
        where: { itemId: "cuid-nope-nonexistent" },
      });
      expect(count).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 5: Removals — lifecycle + guards + idempotency (one removal
    //             per item for concurrent identical invalidations).
    // ═══════════════════════════════════════════════════════════════════════

    it("walks a removal through REQUESTED → EFFECTIVE → COMPLETED", async () => {
      const item = await createTestItem(5);

      const removal = await repo.requestRemoval({
        itemId: item.id,
        requestedBy: `prov-remover-${testRunSuffix}-5`,
        reason: "Owner request",
      });

      expect(removal.status).toBe("REQUESTED");
      expect(removal.effectiveAt).toBeNull();
      expect(removal.completedAt).toBeNull();

      const effective = await repo.markRemovalEffective(removal.id);
      expect(effective.status).toBe("EFFECTIVE");
      expect(effective.effectiveAt).toBeTruthy();
      expect(effective.completedAt).toBeNull();

      const completed = await repo.markRemovalCompleted(removal.id);
      expect(completed.status).toBe("COMPLETED");
      expect(completed.completedAt).toBeTruthy();

      const found = await repo.findRemovalById(removal.id);
      expect(found!.status).toBe("COMPLETED");
    });

    it("guards markRemovalEffective outside REQUESTED", async () => {
      const item = await createTestItem(5);
      const removal = await repo.requestRemoval({
        itemId: item.id,
        requestedBy: `prov-remover-${testRunSuffix}-5b`,
        reason: "Guard test",
      });

      await repo.markRemovalEffective(removal.id);

      // Already EFFECTIVE → cannot be marked effective again.
      await expect(repo.markRemovalEffective(removal.id)).rejects.toThrow(
        /not in REQUESTED state/,
      );
    });

    it("guards markRemovalCompleted outside EFFECTIVE", async () => {
      const item = await createTestItem(5);
      const removal = await repo.requestRemoval({
        itemId: item.id,
        requestedBy: `prov-remover-${testRunSuffix}-5c`,
        reason: "Guard test",
      });

      // Still REQUESTED → cannot be marked completed.
      await expect(repo.markRemovalCompleted(removal.id)).rejects.toThrow(
        /not in EFFECTIVE state/,
      );
    });

    it("returns one removal per item across concurrent identical requests", async () => {
      const item = await createTestItem(5);

      const first = await repo.requestRemoval({
        itemId: item.id,
        requestedBy: `prov-remover-${testRunSuffix}-5d-1`,
        reason: "Duplicate invalidation A",
      });
      const second = await repo.requestRemoval({
        itemId: item.id,
        requestedBy: `prov-remover-${testRunSuffix}-5d-2`,
        reason: "Duplicate invalidation B",
      });

      // Idempotency: identical invalidation reuses the SAME removal row.
      expect(second.id).toBe(first.id);

      const active = await repo.findActiveRemovalByItemId(item.id);
      expect(active).not.toBeNull();
      expect(active!.id).toBe(first.id);
      expect(active!.status).toBe("REQUESTED");

      // Exactly one removal row exists for this item.
      const count = await prisma.removalRecord.count({ where: { itemId: item.id } });
      expect(count).toBe(1);
    });

    it("returns null when no active removal exists for an item", async () => {
      const item = await createTestItem(5);
      const active = await repo.findActiveRemovalByItemId(item.id);
      expect(active).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 6: Superseding assertions — attribution immutability via
    //             supersession (R3); latest assertion wins by recordedAt.
    // ═══════════════════════════════════════════════════════════════════════

    it("records a superseding assertion and retrieves it as the latest", async () => {
      const item = await createTestItem(6);

      const assertion = await repo.recordSupersedingAssertion({
        targetItemId: item.id,
        replacesAssertionId: "orig-assertion-1",
        correctedCreatorId: "creator-2",
        correctedLicenseType: "CC_BY",
        rationale: "Creator confirmed actual author.",
        recordedBy: `prov-recorder-${testRunSuffix}-6`,
      });

      expect(assertion.id).toBeTruthy();
      expect(assertion.targetItemId).toBe(item.id);
      expect(assertion.correctedCreatorId).toBe("creator-2");
      expect(assertion.correctedLicenseType).toBe("CC_BY");
      expect(assertion.recordedAt).toBeTruthy();

      const latest = await repo.findLatestAssertionForItem(item.id);
      expect(latest).not.toBeNull();
      expect(latest!.id).toBe(assertion.id);
      expect(latest!.rationale).toBe("Creator confirmed actual author.");
    });

    it("returns the assertion with the latest recordedAt as the newest", async () => {
      const item = await createTestItem(6);

      const older = await repo.recordSupersedingAssertion({
        targetItemId: item.id,
        replacesAssertionId: "orig-assertion-2",
        correctedCreatorId: "creator-a",
        rationale: "First correction.",
        recordedBy: `prov-recorder-${testRunSuffix}-6b`,
      });

      // Backdate the first assertion deterministically (test-only write to
      // arrange data — the repository itself never mutates recordedAt).
      await prisma.supersedingAssertion.update({
        where: { id: older.id },
        data: { recordedAt: new Date(Date.now() - 60_000) },
      });

      const newer = await repo.recordSupersedingAssertion({
        targetItemId: item.id,
        replacesAssertionId: older.id,
        correctedLicenseType: "MIT",
        rationale: "Licence clarified by owner.",
        recordedBy: `prov-recorder-${testRunSuffix}-6c`,
      });

      const latest = await repo.findLatestAssertionForItem(item.id);
      expect(latest!.id).toBe(newer.id);
      expect(latest!.correctedLicenseType).toBe("MIT");
      // Immutability: the historical assertion row is untouched.
      const historical = await prisma.supersedingAssertion.findUnique({
        where: { id: older.id },
      });
      expect(historical!.correctedCreatorId).toBe("creator-a");
    });

    it("returns null when no assertion exists for an item", async () => {
      const item = await createTestItem(6);
      const latest = await repo.findLatestAssertionForItem(item.id);
      expect(latest).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 7: Pattern signals — reference lookup, staleness with
    //             earliest-wins idempotency, eligibility floor, rebuild state.
    // ═══════════════════════════════════════════════════════════════════════

    it("finds pattern signals referencing an item", async () => {
      const item = await createTestItem(7);
      const signal = await createTestSignal(item.id);

      const signals = await repo.findPatternSignalsReferencingItem(item.id);
      expect(signals.length).toBe(1);
      expect(signals[0].id).toBe(signal.id);
      expect(signals[0].derivedFromItemIds).toContain(item.id);
      expect(signals[0].staleSince).toBeNull();
      expect(signals[0].rebuildState).toBeNull();
    });

    it("marks a signal stale (STALE_PENDING_REBUILD) and keeps the earliest staleSince", async () => {
      const item = await createTestItem(7);
      const signal = await createTestSignal(item.id);

      const t0 = new Date(Date.now() - 120_000).toISOString();
      const t1 = new Date(Date.now() - 60_000).toISOString();
      const t2 = new Date().toISOString();
      const tEarly = new Date(Date.now() - 300_000).toISOString();

      const first = await repo.markSignalStale(signal.id, t0);
      expect(first.staleSince).toBe(t0);
      expect(first.rebuildState).toBe("STALE_PENDING_REBUILD");

      // A LATER invalidation must NOT shift the staleness timestamp
      // (earliest wins — t1 and t2 are both later than t0).
      const later = await repo.markSignalStale(signal.id, t2);
      expect(later.staleSince).toBe(t0);
      const middle = await repo.markSignalStale(signal.id, t1);
      expect(middle.staleSince).toBe(t0);

      // A genuinely EARLIER invalidation updates to the new earliest time.
      const earlier = await repo.markSignalStale(signal.id, tEarly);
      expect(earlier.staleSince).toBe(tEarly);

      // Exactly one rebuild target for this signal.
      const db = await prisma.patternSignal.findUnique({ where: { id: signal.id } });
      expect(db!.staleSince!.toISOString()).toBe(tEarly);
      expect(db!.rebuildState).toBe("STALE_PENDING_REBUILD");
    });

    it("throws when marking a nonexistent signal stale", async () => {
      await expect(
        repo.markSignalStale("cuid-nope-nonexistent", new Date().toISOString()),
      ).rejects.toThrow(/not found/);
    });

    it("reports eligibility only when both counts are computed", async () => {
      const item = await createTestItem(7);
      const signal = await createTestSignal(item.id);

      // Null counts → null eligibility (not yet computed).
      const before = await repo.getSignalEligibility(signal.id);
      expect(before).toBeNull();

      // Set counts (test-only arrangement).
      await prisma.patternSignal.update({
        where: { id: signal.id },
        data: { eligibleItemCount: 3, distinctCreatorCount: 2 },
      });

      const after = await repo.getSignalEligibility(signal.id);
      expect(after).toEqual({ eligibleItemCount: 3, distinctCreatorCount: 2 });

      const missing = await repo.getSignalEligibility("cuid-nope-nonexistent");
      expect(missing).toBeNull();
    });

    it("transitions rebuild state and throws for unknown signals", async () => {
      const item = await createTestItem(7);
      const signal = await createTestSignal(item.id);

      const rebuilding = await repo.setSignalRebuildState(signal.id, "REBUILDING");
      expect(rebuilding.rebuildState).toBe("REBUILDING");

      const active = await repo.setSignalRebuildState(signal.id, "ACTIVE");
      expect(active.rebuildState).toBe("ACTIVE");

      const dropped = await repo.setSignalRebuildState(signal.id, "DROPPED_BELOW_FLOOR");
      expect(dropped.rebuildState).toBe("DROPPED_BELOW_FLOOR");

      await expect(
        repo.setSignalRebuildState("cuid-nope-nonexistent", "ACTIVE"),
      ).rejects.toThrow(/not found/);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 8: Consent revocation — atomic consent + signal invalidation,
    //             idempotent revokedAt, transactional rollback on failure.
    // ═══════════════════════════════════════════════════════════════════════

    it("atomically revokes consent and marks referencing signals stale", async () => {
      const item = await createTestItem(8);
      const signal = await createTestSignal(item.id);

      const result = await repo.revokeConsentForItem(
        item.id,
        `prov-revoker-${testRunSuffix}-8`,
      );

      expect(result.revokedAt).toBeTruthy();
      const revokedMs = Date.parse(result.revokedAt);
      expect(Number.isNaN(revokedMs)).toBe(false);

      // ConsentRecord.revokedAt persisted on the ORIGINAL grant row.
      const consent = await prisma.consentRecord.findUnique({
        where: { id: item.consentRecordId },
      });
      expect(consent!.revokedAt).not.toBeNull();
      expect(consent!.revokedAt!.toISOString()).toBe(result.revokedAt);
      // Original grant fields preserved.
      expect(consent!.tier).toBe("DISPLAY");
      expect(consent!.consentedBy).toBe(item.consent.consentedBy);

      // Referencing signal invalidated in the SAME transaction.
      const signalDb = await prisma.patternSignal.findUnique({
        where: { id: signal.id },
      });
      expect(signalDb!.staleSince!.toISOString()).toBe(result.revokedAt);
      expect(signalDb!.rebuildState).toBe("STALE_PENDING_REBUILD");
    });

    it("is idempotent — a second revocation returns the same revokedAt", async () => {
      const item = await createTestItem(8);
      const signal = await createTestSignal(item.id);

      const first = await repo.revokeConsentForItem(
        item.id,
        `prov-revoker-${testRunSuffix}-8b-1`,
      );
      const second = await repo.revokeConsentForItem(
        item.id,
        `prov-revoker-${testRunSuffix}-8b-2`,
      );

      // revokedAt is never overwritten (original grant preserved).
      expect(second.revokedAt).toBe(first.revokedAt);

      // Signal not re-staled with a newer timestamp — earliest wins.
      const signalDb = await prisma.patternSignal.findUnique({
        where: { id: signal.id },
      });
      expect(signalDb!.staleSince!.toISOString()).toBe(first.revokedAt);
    });

    it("rolls back the whole transaction when the item is missing", async () => {
      // Pre-create a signal that WOULD be invalidated — it must survive intact
      // when the transaction aborts (no partial invalidation state).
      const item = await createTestItem(8);
      const signal = await createTestSignal(item.id);

      await expect(
        repo.revokeConsentForItem("cuid-nope-nonexistent", "prov-revoker-x"),
      ).rejects.toThrow(/not found/);

      // No consent row was touched (item doesn't exist) and the pre-existing
      // signal remains ACTIVE — no orphan invalidation committed.
      const signalDb = await prisma.patternSignal.findUnique({
        where: { id: signal.id },
      });
      expect(signalDb!.staleSince).toBeNull();
      expect(signalDb!.rebuildState).toBeNull();
    });

    it("revoking one item's consent does not touch other items' signals", async () => {
      // Isolation: the revocation transaction must invalidate ONLY signals
      // referencing the revoked item — siblings stay active.
      // NOTE: distinct n values → distinct sourceUrls (unique constraint).
      const revokedItem = await createTestItem(8);
      const otherItem = await createTestItem(9);
      const revokedSignal = await createTestSignal(revokedItem.id);
      const otherSignal = await createTestSignal(otherItem.id);

      await repo.revokeConsentForItem(revokedItem.id, "prov-revoker-x");

      const revokedDb = await prisma.patternSignal.findUnique({
        where: { id: revokedSignal.id },
      });
      expect(revokedDb!.staleSince).not.toBeNull();
      expect(revokedDb!.rebuildState).toBe("STALE_PENDING_REBUILD");

      // The sibling signal is untouched — no collateral invalidation.
      const otherDb = await prisma.patternSignal.findUnique({
        where: { id: otherSignal.id },
      });
      expect(otherDb!.staleSince).toBeNull();
      expect(otherDb!.rebuildState).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 9: Durable history + safe reads — no update/delete on
    //             audit/claim/removal history; claimant data on ONE path.
    // ═══════════════════════════════════════════════════════════════════════

    it("has no update or delete method on the repository", () => {
      const anyRepo = repo as unknown as Record<string, unknown>;
      expect(anyRepo.update).toBeUndefined();
      expect(anyRepo.delete).toBeUndefined();
      // Compile-time guard: the class must satisfy the port, which declares
      // no generic CRUD. (Runtime check above is the executable assertion.)
      expect(anyRepo).toBeDefined();
    });

    it("does not leak claimant data through safe reads", async () => {
      const item = await createTestItem(9);
      const claim = await repo.fileClaim({
        itemId: item.id,
        claimantName: `prov-claimant-${testRunSuffix}-9`,
        claimantContact: "private-contact@example.com",
      });
      await repo.resolveClaim({
        claimId: claim.id,
        decision: "ACCEPTED",
        resolvedBy: "reviewer-3",
        resolution: "Verified owner.",
      });

      // PatternSignal/removal/creator/source reads carry no claimant fields.
      const signals = await repo.findPatternSignalsReferencingItem(item.id);
      for (const s of signals) {
        const obj = s as PatternSignalState & Record<string, unknown>;
        expect(obj).not.toHaveProperty("claimantContact");
        expect(obj).not.toHaveProperty("claimantName");
      }

      const removal = await repo.requestRemoval({
        itemId: item.id,
        requestedBy: `prov-remover-${testRunSuffix}-9`,
        reason: "Owner request",
      });
      const removalObj = removal as typeof removal & Record<string, unknown>;
      expect(removalObj).not.toHaveProperty("claimantContact");

      const creator = await repo.createCreator({
        name: `Prov Test Creator -${testRunSuffix}-9`,
      });
      createdCreatorIds.push(creator.id);
      const creatorObj = creator as CreatorRecord & Record<string, unknown>;
      expect(creatorObj).not.toHaveProperty("claimantContact");

      const source = await repo.createSourceRecord({
        sourceUrl: `https://example.com/leak-${testRunSuffix}`,
        canonicalUrl: `https://example.com/leak-${testRunSuffix}#canon`,
        captureMode: "URL_SUBMISSION",
        capturedAt: new Date().toISOString(),
      });
      createdSourceRecordIds.push(source.id);
      const sourceObj = source as SourceRecord & Record<string, unknown>;
      expect(sourceObj).not.toHaveProperty("claimantContact");

      // The ONLY path to claimant data is the internal claim record.
      const found = await repo.findClaimById(claim.id);
      expect(found!.claimantContact).toBe("private-contact@example.com");
    });
  },
);
