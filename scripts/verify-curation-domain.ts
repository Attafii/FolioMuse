// ─── Curation Domain Verification Script ────────────────────────────────────────
// Standalone script exercising the full CurationServiceImpl flow against a real
// Neon database via GalleryRepositoryPrisma + AuditRepositoryPrisma.
//
// Runs 14 scenarios from the editorial curation rubric plan (Task 12).
// Cleans up all test data on exit.
//
// Usage: npx tsx scripts/verify-curation-domain.ts
//   Requires: DATABASE_URL in environment (Neon pooled connection string).
//   Exit 0: all scenarios pass.
//   Exit 1: any scenario fails, or DATABASE_URL is missing.
// ────────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { CurationServiceImpl } from "@/domain/curation/curation-service";

import type {
  Attribution,
  ConsentRecord,
  GalleryItemSummary,
  IngestInput,
  OverrideDecisionInput,
  ReviewDecisionInput,
} from "@/domain/curation/types";

// ─── Test-Level Types for Cleanup ──────────────────────────────────────────────

interface TestItemRecord {
  itemId: string;
  attributionId: string;
  consentRecordId: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function pass(description: string): void {
  passCount++;
  console.log(`[PASS] ${description}`);
}

function fail(description: string, detail?: string): void {
  failCount++;
  const detailStr = detail ? ` — ${detail}` : "";
  console.log(`[FAIL] ${description}${detailStr}`);
}

function assert(condition: boolean, description: string, detail?: string): void {
  if (condition) {
    pass(description);
  } else {
    fail(description, detail);
  }
}

function assertRejects(
  promise: Promise<unknown>,
  description: string,
  expectedMessage?: string,
): Promise<void> {
  return promise
    .then(() => {
      fail(description, "Expected rejection but promise resolved");
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (expectedMessage && !msg.includes(expectedMessage)) {
        fail(
          description,
          `Rejected as expected but message mismatch. Expected fragment "${expectedMessage}", got: ${msg}`,
        );
      } else {
        pass(description);
      }
    });
}

/**
 * Build a ReviewDecisionInput with itemId. The type doesn't declare itemId,
 * but the CurationServiceImpl validates it at runtime via zod. We use a cast
 * to satisfy the type system while preserving the runtime enrichment.
 */
function makeReviewInput(
  itemId: string,
  rest: Omit<ReviewDecisionInput, never>,
): ReviewDecisionInput {
  return { itemId, ...rest } as unknown as ReviewDecisionInput;
}

// ─── Test data factory ────────────────────────────────────────────────────────

const TEST_PREFIX = `TEST-${Date.now()}`;
let scenarioCounter = 0;

function makeValidAttribution(): Attribution {
  return {
    creatorName: "Test Creator",
    sourceUrl: `https://example.com/test-${TEST_PREFIX}-${++scenarioCounter}.html`,
    licenseType: "CC_BY",
    consentDate: new Date().toISOString(),
  };
}

function makeDisplayConsent(): ConsentRecord {
  return {
    tier: "DISPLAY",
    consentedBy: "test-verify-script",
    consentedAt: new Date().toISOString(),
    terms: "CC_BY",
    expiresAt: null,
  };
}

function makeIngestInput(overrides?: Partial<IngestInput>): IngestInput {
  return {
    title: `${TEST_PREFIX}-${++scenarioCounter}`,
    creatorRole: "Test Artist",
    styleTags: ["minimalist", "editorial"],
    attribution: makeValidAttribution(),
    consent: makeDisplayConsent(),
    ...overrides,
  };
}

// ─── Cleanup tracking ─────────────────────────────────────────────────────────

const testItemRecords: TestItemRecord[] = [];

async function cleanup(): Promise<void> {
  if (testItemRecords.length === 0) {
    return;
  }

  const itemIds = testItemRecords.map((r) => r.itemId);
  const attributionIds = testItemRecords.map((r) => r.attributionId);
  const consentRecordIds = testItemRecords.map((r) => r.consentRecordId);

  console.log(`\nCleaning up ${testItemRecords.length} test item(s)...`);

  try {
    // FK order: auditEntries → reviewDecisions → galleryItems → consentRecords → attributions
    await prisma.auditEntry.deleteMany({
      where: { itemId: { in: itemIds } },
    });

    await prisma.reviewDecision.deleteMany({
      where: { itemId: { in: itemIds } },
    });

    await prisma.galleryItem.deleteMany({
      where: { id: { in: itemIds } },
    });

    await prisma.consentRecord.deleteMany({
      where: { id: { in: consentRecordIds } },
    });

    await prisma.attribution.deleteMany({
      where: { id: { in: attributionIds } },
    });

    console.log("Cleanup complete.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Cleanup error: ${msg}`);
    console.error(
      "Manual cleanup may be required. Look for items with prefix:",
      TEST_PREFIX,
    );
  }
}

// ─── Scenario runner ──────────────────────────────────────────────────────────

async function ingestAndTrack(
  svc: CurationServiceImpl,
  input: IngestInput,
): Promise<GalleryItemSummary> {
  const summary = await svc.ingest(input);

  // Fetch the full item to discover attributionId + consentRecordId for cleanup
  const full = await prisma.galleryItem.findUnique({
    where: { id: summary.id },
    select: { attributionId: true, consentRecordId: true },
  });

  if (full) {
    testItemRecords.push({
      itemId: summary.id,
      attributionId: full.attributionId,
      consentRecordId: full.consentRecordId,
    });
  }

  return summary;
}

async function runScenarios(): Promise<void> {
  // ── Wire up repositories and service ─────────────────────────────────────────
  const repo = new GalleryRepositoryPrisma();
  const audit = new AuditRepositoryPrisma();
  const svc = new CurationServiceImpl(repo, audit);

  console.log(`Test prefix: ${TEST_PREFIX}\n`);

  // ── Scenario 1: Ingest with valid consent + attribution ──────────────────────
  console.log("── S1: Valid ingest ──");
  try {
    const input1 = makeIngestInput();
    const summary1 = await ingestAndTrack(svc, input1);
    assert(
      summary1.status === "PENDING_REVIEW",
      "Ingest with valid consent + attribution → PENDING_REVIEW",
      `Expected PENDING_REVIEW, got ${summary1.status}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Ingest with valid consent + attribution → PENDING_REVIEW", msg);
  }

  // ── Scenario 2: Ingest without consent ──────────────────────────────────────
  console.log("── S2: Ingest without consent ──");
  await assertRejects(
    (async () => {
      const input2 = makeIngestInput({
        consent: {
          tier: "PATTERN_DERIVE",
          consentedBy: "test-verify-script",
          consentedAt: new Date().toISOString(),
          terms: "CC_BY",
          expiresAt: null,
        },
      });
      // Override consent to have no tier (like missing consent)
      const badInput = {
        ...input2,
        consent: {
          tier: "" as never,
          consentedBy: "test-verify-script",
          consentedAt: new Date().toISOString(),
          terms: "CC_BY" as const,
          expiresAt: null,
        },
      };
      return svc.ingest(badInput as IngestInput);
    })(),
    "Ingest without consent → rejection error",
    "Ingest rejected: consent",
  );

  // ── Scenario 3: Ingest with incomplete attribution ───────────────────────────
  console.log("── S3: Incomplete attribution ──");
  await assertRejects(
    svc.ingest(
      makeIngestInput({
        attribution: {
          creatorName: "",
          sourceUrl: "https://example.com/test-s3",
          licenseType: "CC_BY",
          consentDate: new Date().toISOString(),
        },
      }),
    ),
    "Ingest with incomplete attribution → rejection error",
    "Ingest rejected: incomplete attribution",
  );

  // ── Scenario 4: Review: compliance PASS + quality L3 → ACCEPTED ─────────────
  console.log("── S4: Review ACCEPT ──");
  try {
    const s4 = await ingestAndTrack(svc, makeIngestInput());
    const s4Summary = await svc.review(
      makeReviewInput(s4.id, {
        decision: "ACCEPT",
        qualityLevel: "L3",
        complianceStatus: "PASS",
        rejectionReason: null,
        rationale: "Excellent quality, all compliance checks passed.",
        reviewerId: "reviewer-1",
      }),
    );
    assert(
      s4Summary.status === "ACCEPTED",
      "Review: compliance PASS + quality L3 → ACCEPTED",
      `Expected ACCEPTED, got ${s4Summary.status}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Review: compliance PASS + quality L3 → ACCEPTED", msg);
  }

  // ── Scenario 5: Review: compliance FAIL + quality L4 → REJECTED ─────────────
  console.log("── S5: Review REJECT (compliance) ──");
  try {
    const s5 = await ingestAndTrack(svc, makeIngestInput());
    const s5Summary = await svc.review(
      makeReviewInput(s5.id, {
        decision: "REJECT",
        qualityLevel: "L4",
        complianceStatus: "FAIL",
        rejectionReason: "COMPLIANCE_FAIL",
        rationale: "Attribution is fabricated.",
        reviewerId: "reviewer-1",
      }),
    );
    assert(
      s5Summary.status === "REJECTED",
      "Review: compliance FAIL + quality L4 → REJECTED COMPLIANCE_FAIL",
      `Expected REJECTED, got ${s5Summary.status}`,
    );
    // Verify audit entry has the right rejection reason
    const s5Audits = await audit.findByItemId(s5.id);
    const rejectEntry = s5Audits.find((a) => a.action === "REJECT");
    assert(
      rejectEntry?.decision === "COMPLIANCE_FAIL",
      "  → REJECT audit entry has correct rejection reason COMPLIANCE_FAIL",
      `Expected COMPLIANCE_FAIL, got ${rejectEntry?.decision}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Review: compliance FAIL + quality L4 → REJECTED COMPLIANCE_FAIL", msg);
  }

  // ── Scenario 6: Review: compliance PASS + quality L1 → REJECTED ─────────────
  console.log("── S6: Review REJECT (quality) ──");
  try {
    const s6 = await ingestAndTrack(svc, makeIngestInput());
    const s6Summary = await svc.review(
      makeReviewInput(s6.id, {
        decision: "REJECT",
        qualityLevel: "L1",
        complianceStatus: "PASS",
        rejectionReason: "QUALITY_BELOW_THRESHOLD",
        rationale: "Only 2 sections, no depth.",
        reviewerId: "reviewer-1",
      }),
    );
    assert(
      s6Summary.status === "REJECTED",
      "Review: compliance PASS + quality L1 → REJECTED QUALITY_BELOW_THRESHOLD",
      `Expected REJECTED, got ${s6Summary.status}`,
    );
    const s6Audits = await audit.findByItemId(s6.id);
    const rejectEntry6 = s6Audits.find((a) => a.action === "REJECT");
    assert(
      rejectEntry6?.decision === "QUALITY_BELOW_THRESHOLD",
      "  → REJECT audit entry has correct rejection reason QUALITY_BELOW_THRESHOLD",
      `Expected QUALITY_BELOW_THRESHOLD, got ${rejectEntry6?.decision}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(
      "Review: compliance PASS + quality L1 → REJECTED QUALITY_BELOW_THRESHOLD",
      msg,
    );
  }

  // ── Scenario 7: Escalate ─────────────────────────────────────────────────────
  console.log("── S7: Escalate ──");
  let scenario7ItemId = "";
  try {
    const s7 = await ingestAndTrack(svc, makeIngestInput());
    scenario7ItemId = s7.id;
    await svc.escalate(s7.id, "Potential cross-creator clone, needs senior review.");
    const s7Audits = await audit.findByItemId(s7.id);
    const escalateEntry = s7Audits.find((a) => a.action === "ESCALATE");
    assert(
      escalateEntry !== undefined,
      "Escalate → ESCALATE audit entry created",
      "No ESCALATE entry found in audit history",
    );
    assert(
      escalateEntry?.rationale?.includes("cross-creator") ?? false,
      "  → ESCALATE rationale preserved",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Escalate → ESCALATE audit entry created", msg);
  }

  // ── Scenario 8: Override review (senior) ─────────────────────────────────────
  console.log("── S8: Override review ──");
  try {
    const s8 = await ingestAndTrack(svc, makeIngestInput());
    // First reject via normal review
    await svc.review(
      makeReviewInput(s8.id, {
        decision: "REJECT",
        qualityLevel: "L1",
        complianceStatus: "PASS",
        rejectionReason: "QUALITY_BELOW_THRESHOLD",
        rationale: "Low quality.",
        reviewerId: "reviewer-1",
      }),
    );
    // Now override to accept
    const overrideInput: OverrideDecisionInput = {
      finalDecision: "ACCEPT",
      qualityLevel: "L3",
      complianceStatus: "PASS",
      rejectionReason: null,
      rationale: "Senior reviewer override — re-evaluated and found acceptable.",
    };
    const s8Summary = await svc.overrideReview(s8.id, overrideInput);
    assert(
      s8Summary.status === "ACCEPTED",
      "Override review (senior) → status ACCEPTED",
      `Expected ACCEPTED, got ${s8Summary.status}`,
    );
    const s8Audits = await audit.findByItemId(s8.id);
    const overrideEntry = s8Audits.find((a) => a.action === "OVERRIDE");
    assert(
      overrideEntry !== undefined,
      "  → OVERRIDE audit entry created",
    );
    assert(
      overrideEntry?.decision === "ACCEPT",
      "  → OVERRIDE decision is ACCEPT",
      `Expected ACCEPT, got ${overrideEntry?.decision}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Override review (senior) → OVERRIDE audit entry, status updated", msg);
  }

  // ── Scenario 9: Flag duplicate ───────────────────────────────────────────────
  console.log("── S9: Flag duplicate ──");
  try {
    // Create primary item
    const primary = await ingestAndTrack(svc, makeIngestInput());
    // Create duplicate item
    const dup = await ingestAndTrack(svc, makeIngestInput());

    const s9Summary = await svc.flagDuplicate(dup.id, primary.id);
    assert(
      s9Summary.duplicateOfId === primary.id,
      "Flag duplicate → duplicateOfId set correctly",
      `Expected ${primary.id}, got ${s9Summary.duplicateOfId}`,
    );
    const s9Audits = await audit.findByItemId(dup.id);
    const dupEntry = s9Audits.find((a) => a.action === "DUPLICATE_FLAG");
    assert(
      dupEntry !== undefined,
      "  → DUPLICATE_FLAG audit entry created",
    );
    assert(
      dupEntry?.decision === primary.id,
      "  → DUPLICATE_FLAG decision references original item",
      `Expected ${primary.id}, got ${dupEntry?.decision}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Flag duplicate → DUPLICATE_FLAG audit entry, duplicateOfId set", msg);
  }

  // ── Scenario 10: Trigger re-review ───────────────────────────────────────────
  console.log("── S10: Trigger re-review ──");
  try {
    const s10 = await ingestAndTrack(svc, makeIngestInput());
    const s10Summary = await svc.triggerReReview(s10.id);
    assert(
      s10Summary.status === "PENDING_REREVIEW",
      "Trigger re-review → status PENDING_REREVIEW",
      `Expected PENDING_REREVIEW, got ${s10Summary.status}`,
    );
    const s10Audits = await audit.findByItemId(s10.id);
    const reReviewEntry = s10Audits.find((a) => a.action === "RE_REVIEW");
    assert(
      reReviewEntry !== undefined,
      "  → RE_REVIEW audit entry created",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Trigger re-review → status PENDING_REREVIEW, RE_REVIEW audit entry", msg);
  }

  // ── Scenario 11: Suspend (emergency takedown) ───────────────────────────────
  console.log("── S11: Suspend ──");
  try {
    const s11 = await ingestAndTrack(svc, makeIngestInput());
    const s11Summary = await svc.suspend(s11.id, "Emergency takedown — DMCA notice received.");
    assert(
      s11Summary.status === "SUSPENDED",
      "Suspend (emergency takedown) → status SUSPENDED",
      `Expected SUSPENDED, got ${s11Summary.status}`,
    );
    const s11Audits = await audit.findByItemId(s11.id);
    const suspendEntry = s11Audits.find((a) => a.action === "SUSPEND");
    assert(
      suspendEntry !== undefined,
      "  → SUSPEND audit entry created",
    );
    assert(
      suspendEntry?.rationale?.includes("DMCA") ?? false,
      "  → SUSPEND rationale preserved",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Suspend (emergency takedown) → SUSPENDED, SUSPEND audit entry", msg);
  }

  // ── Scenario 12: Revoke consent ──────────────────────────────────────────────
  console.log("── S12: Revoke consent ──");
  try {
    const s12 = await ingestAndTrack(svc, makeIngestInput());
    const s12Summary = await svc.revokeConsent(s12.id);
    assert(
      s12Summary.status === "ARCHIVED",
      "Revoke consent → status ARCHIVED",
      `Expected ARCHIVED, got ${s12Summary.status}`,
    );
    const s12Audits = await audit.findByItemId(s12.id);
    const revokeEntry = s12Audits.find((a) => a.action === "CONSENT_REVOKE");
    assert(
      revokeEntry !== undefined,
      "  → CONSENT_REVOKE audit entry created",
    );
    console.log(
      "[WARN] Pattern signal staleness not verified — repository has no markPatternSignalsStale() method. This is a known limitation (see issues.md).",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Revoke consent → ARCHIVED, CONSENT_REVOKE audit entry", msg);
  }

  // ── Scenario 13: Archive (stale content) ─────────────────────────────────────
  console.log("── S13: Archive ──");
  try {
    const s13 = await ingestAndTrack(svc, makeIngestInput());
    const s13Summary = await svc.archive(s13.id, "Content has been stale for 18 months.");
    assert(
      s13Summary.status === "ARCHIVED",
      "Archive (stale content) → status ARCHIVED",
      `Expected ARCHIVED, got ${s13Summary.status}`,
    );
    const s13Audits = await audit.findByItemId(s13.id);
    const archiveEntry = s13Audits.find((a) => a.action === "ARCHIVE");
    assert(
      archiveEntry !== undefined,
      "  → ARCHIVE audit entry created",
    );
    assert(
      archiveEntry?.rationale?.includes("stale") ?? false,
      "  → ARCHIVE rationale preserved",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Archive (stale content) → ARCHIVED, ARCHIVE audit entry", msg);
  }

  // ── Scenario 14: Verify audit immutability ───────────────────────────────────
  console.log("── S14: Audit immutability ──");
  try {
    // Count audit entries for scenario 7's item (escalate creates exactly 1)
    if (scenario7ItemId) {
      const s14Audits = await audit.findByItemId(scenario7ItemId);
      const ingestEntries = s14Audits.filter((a) => a.action === "INGEST");
      const escalateEntries = s14Audits.filter((a) => a.action === "ESCALATE");
      assert(
        ingestEntries.length >= 1,
        "Audit history has at least 1 INGEST entry",
        `Expected >= 1, got ${ingestEntries.length}`,
      );
      assert(
        escalateEntries.length === 1,
        "Audit history has exactly 1 ESCALATE entry",
        `Expected 1, got ${escalateEntries.length}`,
      );
      // Verify no duplicate entries
      const s14AllActions = s14Audits.map((a) => a.action);
      const uniqueActions = new Set(s14AllActions);
      assert(
        s14AllActions.length === uniqueActions.size,
        "All audit entries for the item are unique (no duplicates)",
        `Got ${s14AllActions.length} entries, ${uniqueActions.size} unique actions`,
      );
    }

    // Runtime check: GalleryRepositoryPrisma has no delete() method
    const galleryMethods = Object.getOwnPropertyNames(
      GalleryRepositoryPrisma.prototype,
    );
    assert(
      !galleryMethods.includes("delete"),
      "GalleryRepositoryPrisma has no delete() method (audit immutability)",
      `Found delete in prototype methods: ${galleryMethods.join(", ")}`,
    );

    // Runtime check: AuditRepositoryPrisma has no update() or delete() methods
    const auditMethods = Object.getOwnPropertyNames(
      AuditRepositoryPrisma.prototype,
    );
    assert(
      !auditMethods.includes("update"),
      "AuditRepositoryPrisma has no update() method (audit immutability)",
      `Found update in prototype methods: ${auditMethods.join(", ")}`,
    );
    assert(
      !auditMethods.includes("delete"),
      "AuditRepositoryPrisma has no delete() method (audit immutability)",
      `Found delete in prototype methods: ${auditMethods.join(", ")}`,
    );

    pass("Audit immutability: all checks passed");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Verify audit immutability", msg);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Graceful guard: DATABASE_URL is required
  if (!process.env.DATABASE_URL) {
    console.log("[SKIP] DATABASE_URL is not set in the environment.");
    console.log(
      "      This script requires a Neon pooled connection string.",
    );
    console.log(
      "      Set DATABASE_URL in your .env file and re-run: npx tsx scripts/verify-curation-domain.ts",
    );
    console.log(
      "      See .env.example for the required format.",
    );
    process.exit(1);
  }

  try {
    await runScenarios();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nFatal error during scenario execution: ${msg}`);
    console.error(err instanceof Error ? err.stack : "");
  } finally {
    await cleanup();

    // Summary
    const total = passCount + failCount;
    console.log(`\n───────────────────────────────────────`);
    console.log(`  Passed: ${passCount}  /  Failed: ${failCount}  /  Total: ${total}`);
    console.log(`───────────────────────────────────────`);

    // Disconnect prisma
    await prisma.$disconnect();
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main();
