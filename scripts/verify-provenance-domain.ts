// ─── Provenance Domain Verification Script ─────────────────────────────────────
// Standalone script exercising the full ProvenanceService lifecycle against a
// real Neon database via ProvenanceRepositoryPrisma (+ GalleryRepositoryPrisma
// for gallery-item fixtures, since claims/removals/consent-revocation FK to
// GalleryItem/ConsentRecord).
//
// Covers (plan Task 12): registration, AI disclosure, effective-permission
// gating, safe projection, structural lesson acceptance/rejection (R2 floor),
// claim + removal, consent revocation, stale propagation, rebuild/drop floor,
// policy §9.1 ordering (stale commit BEFORE enqueue), idempotent retry, and
// cleanup in `finally`.
//
// Usage: npx tsx scripts/verify-provenance-domain.ts
//   Requires: DATABASE_URL in environment (Neon pooled connection string).
//   Exit 0: all scenarios pass.
//   Exit 1: any scenario fails, or DATABASE_URL is missing.
// ────────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { GalleryRepositoryPrisma } from "@/persistence/gallery-repository-prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import { ProvenanceService } from "@/domain/provenance/provenance-service";
import type {
  ProvenanceClock,
  ProvenanceRebuildQueue,
  ProvenanceTelemetry,
} from "@/domain/provenance/ports";
import type {
  NewAiProvenanceInput,
  NewCreatorInput,
  NewSourceRecordInput,
  ProvenanceTelemetryEvent,
} from "@/domain/provenance/types";
import type { StructuralLesson } from "@/domain/provenance/schemas";
import type {
  Attribution,
  ConsentRecord,
  GalleryItem,
  NewGalleryItemInput,
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

// ─── Test data factory ────────────────────────────────────────────────────────

const TEST_PREFIX = `PROV-${Date.now()}`;
let scenarioCounter = 0;

function makeCreatorInput(): NewCreatorInput {
  return {
    name: `${TEST_PREFIX}-creator-${++scenarioCounter}`,
    url: `https://example.com/creator-${TEST_PREFIX}-${scenarioCounter}.html`,
  };
}

function makeSourceInput(overrides?: Partial<NewSourceRecordInput>): NewSourceRecordInput {
  return {
    sourceUrl: `https://example.com/source-${TEST_PREFIX}-${++scenarioCounter}.html`,
    canonicalUrl: `https://example.com/source-${TEST_PREFIX}-${scenarioCounter}.html`,
    captureMode: "MANUAL_SUBMISSION",
    capturedAt: new Date().toISOString(),
    evidenceHash: null,
    ...overrides,
  };
}

function makeAiProvenanceInput(
  overrides?: Partial<NewAiProvenanceInput>,
): NewAiProvenanceInput {
  return {
    provider: `${TEST_PREFIX}-provider`,
    modelName: "gpt-4o",
    generatedAt: new Date().toISOString(),
    disclosureStatus: "AI_GENERATED",
    promptHash: null,
    outputHash: null,
    ...overrides,
  };
}

function makeValidAttribution(): Attribution {
  return {
    creatorName: `${TEST_PREFIX}-attrib-creator`,
    sourceUrl: `https://example.com/item-${TEST_PREFIX}-${++scenarioCounter}.html`,
    licenseType: "CC_BY",
    consentDate: new Date().toISOString(),
  };
}

function makeConsent(): ConsentRecord {
  return {
    tier: "PATTERN_DERIVE",
    consentedBy: "test-verify-provenance",
    consentedAt: new Date().toISOString(),
    terms: "CC_BY",
    expiresAt: null,
  };
}

function makeIngestInput(overrides?: Partial<NewGalleryItemInput>): NewGalleryItemInput {
  return {
    title: `${TEST_PREFIX}-${++scenarioCounter}`,
    creatorRole: "Test Artist",
    styleTags: ["minimalist", "editorial"],
    attribution: makeValidAttribution(),
    consent: makeConsent(),
    ...overrides,
  };
}

/** Build a valid StructuralLesson above the R2 floor (3 items / 2 creators). */
function makeLesson(overrides?: Partial<StructuralLesson>): StructuralLesson {
  return {
    patternType: `${TEST_PREFIX}-EDITORIAL_HERO`,
    sourceItemCount: 3,
    distinctCreatorCount: 2,
    sectionFrequency: { hero: 3, about: 2 },
    commonTags: ["minimalist"],
    averageSectionCount: 4,
    ...overrides,
  };
}

// ─── Cleanup tracking ─────────────────────────────────────────────────────────

const testItemRecords: TestItemRecord[] = [];
const createdSignalIds: string[] = [];

async function cleanup(): Promise<void> {
  const itemIds = testItemRecords.map((r) => r.itemId);
  const attributionIds = testItemRecords.map((r) => r.attributionId);
  const consentRecordIds = testItemRecords.map((r) => r.consentRecordId);

  console.log(
    `\nCleaning up ${testItemRecords.length} fixture item(s) + provenance rows...`,
  );

  try {
    // Child-before-parent order (all FK relations are onDelete: Restrict).
    if (itemIds.length > 0) {
      await prisma.auditEntry.deleteMany({ where: { itemId: { in: itemIds } } });
      await prisma.reviewDecision.deleteMany({ where: { itemId: { in: itemIds } } });
      await prisma.ownershipClaim.deleteMany({ where: { itemId: { in: itemIds } } });
      await prisma.removalRecord.deleteMany({ where: { itemId: { in: itemIds } } });
      await prisma.supersedingAssertion.deleteMany({
        where: { targetItemId: { in: itemIds } },
      });
      await prisma.galleryItem.deleteMany({ where: { id: { in: itemIds } } });
    }
    if (consentRecordIds.length > 0) {
      await prisma.consentRecord.deleteMany({ where: { id: { in: consentRecordIds } } });
    }
    if (attributionIds.length > 0) {
      await prisma.attribution.deleteMany({ where: { id: { in: attributionIds } } });
    }
    if (createdSignalIds.length > 0) {
      await prisma.patternSignal.deleteMany({ where: { id: { in: createdSignalIds } } });
    }

    // Provenance-only rows (identified by TEST_PREFIX).
    await prisma.sourceRecord.deleteMany({
      where: { canonicalUrl: { startsWith: `https://example.com/source-${TEST_PREFIX}` } },
    });
    await prisma.aiProvenance.deleteMany({
      where: { provider: { startsWith: TEST_PREFIX } },
    });
    await prisma.creator.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });

    console.log("Cleanup complete.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Cleanup error: ${msg}`);
    console.error(
      "Manual cleanup may be required. Look for rows with prefix:",
      TEST_PREFIX,
    );
  }
}

// ─── Scenario runner ──────────────────────────────────────────────────────────

async function ingestFixtureItem(
  repo: GalleryRepositoryPrisma,
  input?: NewGalleryItemInput,
): Promise<GalleryItem> {
  const item = await repo.ingest(input ?? makeIngestInput());
  const full = await prisma.galleryItem.findUnique({
    where: { id: item.id },
    select: { attributionId: true, consentRecordId: true },
  });
  if (full) {
    testItemRecords.push({
      itemId: item.id,
      attributionId: full.attributionId,
      consentRecordId: full.consentRecordId,
    });
  }
  return item;
}

async function createSignal(
  itemId: string,
  patternType: string,
  counts?: { eligibleItemCount: number; distinctCreatorCount: number },
): Promise<{ id: string }> {
  const signal = await prisma.patternSignal.create({
    data: {
      derivedFromItemIds: [itemId],
      patternType: `${TEST_PREFIX}-${patternType}`,
      staleSince: null,
      eligibleItemCount: counts?.eligibleItemCount ?? null,
      distinctCreatorCount: counts?.distinctCreatorCount ?? null,
      rebuildState: null,
    },
    select: { id: true },
  });
  createdSignalIds.push(signal.id);
  return signal;
}

async function runScenarios(): Promise<void> {
  // ── Wire up repositories, service, and observability fakes ──────────────────
  const galleryRepo = new GalleryRepositoryPrisma();
  const provenance = new ProvenanceRepositoryPrisma();
  const clock: ProvenanceClock = { now: () => new Date().toISOString() };

  // Shared sequence log proves the policy §9.1 order: the stale state COMMITS
  // (PATTERN_INVALIDATED telemetry emitted right after the commit) BEFORE the
  // rebuild decision is enqueued. Telemetry emit pushes first, enqueue second.
  const telemetryEvents: ProvenanceTelemetryEvent[] = [];
  const enqueuedRebuilds: {
    removalId: string;
    signalId: string;
    triggeredAt: string;
  }[] = [];
  const orderLog: string[] = [];

  const telemetry: ProvenanceTelemetry = {
    emit: (event) => {
      telemetryEvents.push(event);
      orderLog.push(`telemetry:${event.type}`);
    },
  };
  const rebuildQueue: ProvenanceRebuildQueue = {
    enqueueRebuild: async (input) => {
      enqueuedRebuilds.push(input);
      orderLog.push(`enqueue:${input.signalId}`);
      console.log(
        `  [QUEUE] rebuild enqueued: removal=${input.removalId} signal=${input.signalId} at=${input.triggeredAt}`,
      );
    },
  };

  const svc = new ProvenanceService(provenance, rebuildQueue, clock, telemetry);

  console.log(`Test prefix: ${TEST_PREFIX}\n`);

  // ── Scenario 1: Registration (human-authored artifact) ───────────────────────
  console.log("── S1: Registration ──");
  try {
    const creator = makeCreatorInput();
    const source = makeSourceInput();
    const result = await svc.registerArtifact({
      creator,
      source,
      permission: {
        licence: "CC_BY",
        consentTier: "PATTERN_DERIVE",
        intendedUse: "PATTERN_DERIVE",
      },
    });
    assert(
      result.creatorId !== null && result.sourceRecordId !== "",
      "Registration → creatorId + sourceRecordId returned",
      `creatorId=${result.creatorId} sourceRecordId=${result.sourceRecordId}`,
    );
    assert(
      result.aiProvenanceId === null,
      "  → no AI provenance for a human-authored artifact",
    );
    assert(
      result.permission === "PATTERN_DERIVE",
      "  → effective permission = PATTERN_DERIVE (CC_BY + PATTERN_DERIVE consent)",
      `got ${result.permission}`,
    );
    assert(result.duplicated === false, "  → first registration is not a duplicate");

    const dbCreator = await provenance.findCreatorById(result.creatorId!);
    const dbSource = await provenance.findSourceRecordByCanonicalUrl(source.canonicalUrl);
    assert(dbCreator?.name === creator.name, "  → Creator row persisted");
    assert(
      dbSource?.sourceUrl === source.sourceUrl,
      "  → SourceRecord row persisted",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Registration → creatorId + sourceRecordId + PATTERN_DERIVE", msg);
  }

  // ── Scenario 2: Idempotent duplicate registration (retry safety) ─────────────
  console.log("── S2: Duplicate registration (idempotent) ──");
  try {
    const source = makeSourceInput();
    const first = await svc.registerArtifact({
      creator: makeCreatorInput(),
      source,
      permission: {
        licence: "CC0",
        consentTier: "FULL",
        intendedUse: "FULL",
      },
    });
    const second = await svc.registerArtifact({
      creator: makeCreatorInput(),
      source,
      permission: {
        licence: "CC0",
        consentTier: "FULL",
        intendedUse: "FULL",
      },
    });
    assert(second.duplicated === true, "Duplicate registration → duplicated=true");
    assert(
      second.sourceRecordId === first.sourceRecordId,
      "  → same sourceRecordId reused (no orphan rows)",
      `first=${first.sourceRecordId} second=${second.sourceRecordId}`,
    );
    const rows = await prisma.sourceRecord.count({
      where: { canonicalUrl: source.canonicalUrl },
    });
    assert(rows === 1, "  → exactly 1 SourceRecord row for the canonicalUrl", `got ${rows}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Duplicate registration → duplicated=true, single row", msg);
  }

  // ── Scenario 3: AI disclosure ────────────────────────────────────────────────
  console.log("── S3: AI disclosure ──");
  try {
    // Mandatory disclosure: UNKNOWN is rejected for new records (policy §6.1).
    await assertRejects(
      svc.registerArtifact({
        creator: makeCreatorInput(),
        source: makeSourceInput(),
        aiProvenance: makeAiProvenanceInput({ disclosureStatus: "UNKNOWN" }),
        permission: {
          licence: "CC_BY",
          consentTier: "PATTERN_DERIVE",
          intendedUse: "PATTERN_DERIVE",
        },
      }),
      "Registration with disclosureStatus UNKNOWN → rejected",
      "incomplete provenance",
    );

    // AI_GENERATED is accepted and recorded.
    const ai = makeAiProvenanceInput({ disclosureStatus: "AI_GENERATED" });
    const result = await svc.registerArtifact({
      creator: makeCreatorInput(),
      source: makeSourceInput(),
      aiProvenance: ai,
      permission: {
        licence: "CC_BY",
        consentTier: "PATTERN_DERIVE",
        intendedUse: "PATTERN_DERIVE",
      },
    });
    assert(
      result.aiProvenanceId !== null,
      "AI_GENERATED disclosure → aiProvenanceId recorded",
      `got ${result.aiProvenanceId}`,
    );
    const dbAi = result.aiProvenanceId
      ? await provenance.findAiProvenanceById(result.aiProvenanceId)
      : null;
    assert(
      dbAi?.disclosureStatus === "AI_GENERATED",
      "  → AiProvenance row persisted with disclosureStatus=AI_GENERATED",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("AI disclosure → UNKNOWN rejected, AI_GENERATED recorded", msg);
  }

  // ── Scenario 4: Effective-permission gating (licence ∩ consent ∩ policy) ─────
  console.log("── S4: Permission gating ──");
  try {
    // ND licence forbids derivation even with PATTERN_DERIVE consent.
    await assertRejects(
      svc.registerArtifact({
        creator: makeCreatorInput(),
        source: makeSourceInput(),
        permission: {
          licence: "CC_BY_ND",
          consentTier: "PATTERN_DERIVE",
          intendedUse: "PATTERN_DERIVE",
        },
      }),
      "CC_BY_ND + PATTERN_DERIVE intent → rejected",
      "do not permit pattern derivation",
    );
    // DISPLAY consent gates derivation on permissive licences.
    await assertRejects(
      svc.registerArtifact({
        creator: makeCreatorInput(),
        source: makeSourceInput(),
        permission: {
          licence: "CC_BY",
          consentTier: "DISPLAY",
          intendedUse: "PATTERN_DERIVE",
        },
      }),
      "CC_BY + DISPLAY consent + PATTERN_DERIVE intent → rejected",
      "do not permit pattern derivation",
    );
    // FULL intent requires effective FULL permission.
    await assertRejects(
      svc.registerArtifact({
        creator: makeCreatorInput(),
        source: makeSourceInput(),
        permission: {
          licence: "CC_BY",
          consentTier: "PATTERN_DERIVE",
          intendedUse: "FULL",
        },
      }),
      "CC_BY + PATTERN_DERIVE consent + FULL intent → rejected",
      "effective permission is PATTERN_DERIVE",
    );
    // Permissive combination accepted.
    const ok = await svc.registerArtifact({
      creator: makeCreatorInput(),
      source: makeSourceInput(),
      permission: {
        licence: "CC0",
        consentTier: "FULL",
        intendedUse: "FULL",
      },
    });
    assert(
      ok.permission === "FULL",
      "CC0 + FULL consent + FULL intent → accepted with permission FULL",
      `got ${ok.permission}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Permission gating → ND/DISPLAY/FULL-intent rejections, CC0 FULL accepted", msg);
  }

  // ── Scenario 5: Safe projection ──────────────────────────────────────────────
  console.log("── S5: Safe projection ──");
  try {
    const sourceInput = makeSourceInput();
    const result = await svc.registerArtifact({
      creator: makeCreatorInput(),
      source: sourceInput,
      aiProvenance: makeAiProvenanceInput(),
      permission: {
        licence: "CC_BY",
        consentTier: "PATTERN_DERIVE",
        intendedUse: "PATTERN_DERIVE",
      },
    });
    const creatorRec = await provenance.findCreatorById(result.creatorId!);
    const sourceRec = await provenance.findSourceRecordByCanonicalUrl(
      sourceInput.canonicalUrl,
    );
    const aiRec = result.aiProvenanceId
      ? await provenance.findAiProvenanceById(result.aiProvenanceId)
      : null;

    // Runtime proof: domain records never carry private/raw capture fields.
    const forbiddenKeys = ["contentBlob", "rawPrompt", "claimantContact", "claimantEmail"];
    const recordKeys = [
      ...Object.keys(creatorRec ?? {}),
      ...Object.keys(sourceRec ?? {}),
      ...Object.keys(aiRec ?? {}),
    ];
    const leaked = forbiddenKeys.filter((k) => recordKeys.includes(k));
    assert(
      leaked.length === 0,
      "Registered records expose no contentBlob/rawPrompt/claimant contact",
      leaked.length > 0 ? `leaked keys: ${leaked.join(", ")}` : undefined,
    );

    // Append-only contract: no generic update/delete on the repository.
    const repoMethods = Object.getOwnPropertyNames(
      ProvenanceRepositoryPrisma.prototype,
    );
    const hasUpdate = repoMethods.includes("update");
    const hasDelete = repoMethods.includes("delete");
    assert(
      !hasUpdate && !hasDelete,
      "ProvenanceRepositoryPrisma has no update()/delete() (durable by contract)",
      `update=${hasUpdate} delete=${hasDelete} on prototype: ${repoMethods.join(", ")}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Safe projection → no private fields, no update/delete methods", msg);
  }

  // ── Scenario 6: Structural lesson acceptance (R2 floor) ──────────────────────
  console.log("── S6: Structural lesson accepted ──");
  try {
    const lesson = await svc.createStructuralLesson(makeLesson());
    assert(
      lesson.sourceItemCount === 3 && lesson.distinctCreatorCount === 2,
      "Lesson with 3 items / 2 creators → accepted",
      `got ${lesson.sourceItemCount}/${lesson.distinctCreatorCount}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Lesson with 3 items / 2 creators → accepted", msg);
  }

  // ── Scenario 7: Structural lesson rejection below floor ──────────────────────
  console.log("── S7: Lesson rejected below floor ──");
  try {
    await assertRejects(
      svc.createStructuralLesson(makeLesson({ sourceItemCount: 2 })),
      "Lesson with 2 items → rejected",
      "below R2 floor",
    );
    await assertRejects(
      svc.createStructuralLesson(
        makeLesson({ sourceItemCount: 3, distinctCreatorCount: 1 }),
      ),
      "Lesson with 1 creator → rejected",
      "below R2 floor",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Lesson with 2 items / 1 creator → rejected", msg);
  }

  // ── Scenario 8: Claim filed + REJECTED resolution (no auto-removal) ──────────
  console.log("── S8: Claim REJECTED ──");
  try {
    const item = await ingestFixtureItem(galleryRepo);
    const claim = await svc.fileClaim({
      itemId: item.id,
      claimantName: "Disputed Author",
      claimantContact: "disputed-author@example.com",
    });
    assert(claim.status === "PENDING", "fileClaim → PENDING", `got ${claim.status}`);
    assert(
      claim.claimantContact === "disputed-author@example.com",
      "  → claimantContact preserved on the internal record",
    );

    const resolved = await svc.resolveClaim({
      claimId: claim.id,
      decision: "REJECTED",
      resolvedBy: "reviewer-1",
      resolution: "Submitted ownership proof does not match the source.",
    });
    assert(resolved.status === "REJECTED", "resolveClaim REJECTED → status REJECTED");
    assert(
      resolved.resolvedAt !== null && resolved.resolvedBy === "reviewer-1",
      "  → resolution metadata recorded",
    );

    const removal = await provenance.findActiveRemovalByItemId(item.id);
    assert(
      removal === null,
      "  → no removal auto-created for a REJECTED claim",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Claim REJECTED → REJECTED, no auto-removal", msg);
  }

  // ── Scenario 9: Claim ACCEPTED → durable removal auto-requested ──────────────
  console.log("── S9: Claim ACCEPTED → auto-removal ──");
  try {
    const item = await ingestFixtureItem(galleryRepo);
    const claim = await svc.fileClaim({
      itemId: item.id,
      claimantName: "Rights Holder",
      claimantContact: "rights-holder@example.com",
    });
    const resolved = await svc.resolveClaim({
      claimId: claim.id,
      decision: "ACCEPTED",
      resolvedBy: "reviewer-2",
      resolution: "Creator confirmed unauthorized reproduction.",
    });
    assert(resolved.status === "ACCEPTED", "resolveClaim ACCEPTED → status ACCEPTED");

    const removal = await provenance.findActiveRemovalByItemId(item.id);
    assert(removal !== null, "  → removal auto-created for an ACCEPTED claim");
    assert(
      removal?.status === "REQUESTED",
      "  → removal status REQUESTED (durable, never deleted)",
      `got ${removal?.status}`,
    );
    assert(
      removal?.requestedBy === "reviewer-2",
      "  → removal.requestedBy = resolving reviewer",
      `got ${removal?.requestedBy}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Claim ACCEPTED → removal REQUESTED by resolving reviewer", msg);
  }

  // ── Scenario 10: Removal lifecycle + stale propagation + §9.1 order ──────────
  console.log("── S10: Removal lifecycle ──");
  try {
    const item = await ingestFixtureItem(galleryRepo);
    const signal = await createSignal(item.id, "EDITORIAL_HERO", {
      eligibleItemCount: 3,
      distinctCreatorCount: 2,
    });

    // Idempotent retry: two identical requests produce ONE removal row.
    const removalA = await svc.requestRemoval({
      itemId: item.id,
      requestedBy: "reviewer-3",
      reason: "Duplicate of another listing.",
    });
    const removalB = await svc.requestRemoval({
      itemId: item.id,
      requestedBy: "reviewer-3",
      reason: "Duplicate of another listing.",
    });
    assert(
      removalA.id === removalB.id,
      "Duplicate removal request → same removal record (idempotent retry)",
      `first=${removalA.id} second=${removalB.id}`,
    );
    assert(removalA.status === "REQUESTED", "  → status REQUESTED");

    const orderLogStart = orderLog.length;
    const effective = await svc.markRemovalEffective(removalA.id);
    assert(effective.status === "EFFECTIVE", "markRemovalEffective → EFFECTIVE");
    assert(effective.effectiveAt !== null, "  → effectiveAt recorded");

    // Stale propagation: the referencing signal is stale + pending rebuild.
    const dbSignal = await provenance.findPatternSignalsReferencingItem(item.id);
    assert(dbSignal.length === 1, "  → referencing signal found", `got ${dbSignal.length}`);
    assert(
      dbSignal[0]?.staleSince === effective.effectiveAt,
      "  → signal.staleSince == removal effectiveAt",
      `staleSince=${dbSignal[0]?.staleSince} effectiveAt=${effective.effectiveAt}`,
    );
    assert(
      dbSignal[0]?.rebuildState === "STALE_PENDING_REBUILD",
      "  → signal.rebuildState = STALE_PENDING_REBUILD",
      `got ${dbSignal[0]?.rebuildState}`,
    );

    // Enqueue by idempotency key, triggered by effectiveAt.
    assert(
      enqueuedRebuilds.some(
        (e) =>
          e.removalId === removalA.id &&
          e.signalId === signal.id &&
          e.triggeredAt === effective.effectiveAt,
      ),
      "  → rebuild enqueued keyed (removalId, signalId, effectiveAt)",
    );

    // Policy §9.1 order: the stale state commits BEFORE the enqueue. The shared
    // order log proves PATTERN_INVALIDATED (emitted right after the commit)
    // precedes the enqueue for the same signal.
    const invalidIdx = orderLog.lastIndexOf("telemetry:PATTERN_INVALIDATED");
    const enqueueIdx = orderLog.lastIndexOf(`enqueue:${signal.id}`);
    assert(
      invalidIdx >= orderLogStart &&
        enqueueIdx > invalidIdx &&
        orderLog.slice(orderLogStart, enqueueIdx).includes("telemetry:PATTERN_INVALIDATED"),
      "  → stale commit (PATTERN_INVALIDATED) precedes rebuild enqueue (§9.1)",
      `orderLog: ${orderLog.slice(orderLogStart).join(" → ")}`,
    );

    // Illegal transition: EFFECTIVE cannot be marked effective again.
    await assertRejects(
      svc.markRemovalEffective(removalA.id),
      "Re-marking an EFFECTIVE removal → rejected",
      "not in REQUESTED state",
    );

    const completed = await svc.markRemovalCompleted(removalA.id);
    assert(completed.status === "COMPLETED", "markRemovalCompleted → COMPLETED");
    assert(
      completed.completedAt !== null &&
        new Date(completed.completedAt).getTime() >=
          new Date(completed.effectiveAt ?? 0).getTime(),
      "  → completedAt >= effectiveAt (chronological lifecycle)",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(
      "Removal lifecycle → REQUESTED/EFFECTIVE/COMPLETED + stale + §9.1 order + idempotent retry",
      msg,
    );
  }

  // ── Scenario 11: Rebuild above floor → ACTIVE ────────────────────────────────
  console.log("── S11: Rebuild above floor ──");
  try {
    const item = await ingestFixtureItem(galleryRepo);
    const signal = await createSignal(item.id, "EDITORIAL_HERO", {
      eligibleItemCount: 3,
      distinctCreatorCount: 2,
    });
    const rebuilt = await svc.rebuildSignal(signal.id);
    assert(
      rebuilt.rebuildState === "ACTIVE",
      "rebuildSignal with 3 items / 2 creators → ACTIVE",
      `got ${rebuilt.rebuildState}`,
    );
    assert(
      telemetryEvents.some((e) => e.type === "REBUILD_SUCCESS" && e.signalId === signal.id),
      "  → REBUILD_SUCCESS telemetry emitted",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Rebuild above floor → ACTIVE + REBUILD_SUCCESS", msg);
  }

  // ── Scenario 12: Rebuild below floor → DROPPED_BELOW_FLOOR ───────────────────
  console.log("── S12: Rebuild below floor ──");
  try {
    const item = await ingestFixtureItem(galleryRepo);
    const signal = await createSignal(item.id, "EDITORIAL_HERO", {
      eligibleItemCount: 2,
      distinctCreatorCount: 1,
    });
    const rebuilt = await svc.rebuildSignal(signal.id);
    assert(
      rebuilt.rebuildState === "DROPPED_BELOW_FLOOR",
      "rebuildSignal with 2 items / 1 creator → DROPPED_BELOW_FLOOR (never deleted)",
      `got ${rebuilt.rebuildState}`,
    );
    const below = telemetryEvents.find(
      (e): e is Extract<ProvenanceTelemetryEvent, { type: "REBUILD_BELOW_FLOOR" }> =>
        e.type === "REBUILD_BELOW_FLOOR" && e.signalId === signal.id,
    );
    assert(
      below?.itemCount === 2 && below?.creatorCount === 1,
      "  → REBUILD_BELOW_FLOOR telemetry carries counts",
      `got itemCount=${below?.itemCount} creatorCount=${below?.creatorCount}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Rebuild below floor → DROPPED_BELOW_FLOOR", msg);
  }

  // ── Scenario 13: Consent revocation + stale propagation + idempotent retry ───
  console.log("── S13: Consent revocation ──");
  try {
    const item = await ingestFixtureItem(galleryRepo);
    const signal = await createSignal(item.id, "EDITORIAL_HERO", {
      eligibleItemCount: 3,
      distinctCreatorCount: 2,
    });

    const orderLogStart = orderLog.length;
    const first = await svc.revokeConsent(item.id, "system");
    assert(typeof first.revokedAt === "string", "revokeConsent → revokedAt returned");

    // revokedAt recorded on the ORIGINAL grant row (ADR-0003 D3).
    const full = await prisma.galleryItem.findUnique({
      where: { id: item.id },
      select: { consentRecordId: true },
    });
    const consent = full
      ? await prisma.consentRecord.findUnique({ where: { id: full.consentRecordId } })
      : null;
    assert(
      consent?.revokedAt?.toISOString() === first.revokedAt,
      "  → ConsentRecord.revokedAt persisted on the original grant",
      `db=${consent?.revokedAt?.toISOString()} returned=${first.revokedAt}`,
    );

    // Stale propagation + enqueue keyed by itemId (no removal record exists).
    const signals = await provenance.findPatternSignalsReferencingItem(item.id);
    assert(
      signals[0]?.staleSince === first.revokedAt,
      "  → referencing signal staleSince == revokedAt",
      `staleSince=${signals[0]?.staleSince}`,
    );
    assert(
      enqueuedRebuilds.some(
        (e) => e.removalId === item.id && e.signalId === signal.id,
      ),
      "  → rebuild enqueued keyed removalId=itemId (consent has no removal record)",
    );

    // §9.1 order: CONSENT_REVOKED (after commit) precedes the enqueue.
    const consentIdx = orderLog.lastIndexOf("telemetry:CONSENT_REVOKED");
    const enqueueIdx = orderLog.lastIndexOf(`enqueue:${signal.id}`);
    assert(
      consentIdx >= orderLogStart && enqueueIdx > consentIdx,
      "  → revocation commit precedes rebuild enqueue (§9.1)",
      `orderLog: ${orderLog.slice(orderLogStart).join(" → ")}`,
    );

    // Idempotent retry: duplicate revocation never overwrites revokedAt and
    // enqueues once per signal.
    const second = await svc.revokeConsent(item.id, "system");
    assert(
      second.revokedAt === first.revokedAt,
      "Duplicate revocation → same revokedAt (never overwritten)",
      `first=${first.revokedAt} second=${second.revokedAt}`,
    );
    const signalEnqueues = enqueuedRebuilds.filter(
      (e) => e.signalId === signal.id && e.removalId === item.id,
    );
    assert(
      signalEnqueues.length === 1,
      "  → single enqueue per (itemId, signalId) after retry",
      `got ${signalEnqueues.length}`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail("Consent revocation → revokedAt + stale + enqueue + idempotent retry", msg);
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
      "      Set DATABASE_URL in your .env file and re-run: npx tsx scripts/verify-provenance-domain.ts",
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
