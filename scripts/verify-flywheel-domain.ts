// ─── Flywheel Domain Verification Script (ADR-0004) ──────────────────────────
// Standalone script exercising the flywheel domain services against a real
// Neon database via FlywheelRepositoryPrisma (+ GalleryRepositoryPrisma for
// gallery-item fixtures, since BehaviorEvent/RankingScore FK to GalleryItem).
//
// Covers (plan Task 12, S1-S12): ingest of all 8 event types, idempotency,
// typed invalid-input errors, ranking determinism, saturation decay, R2
// diversity, suggestion R2 floor, bounded suggestion uplift, deterministic
// experiment assignment, guardrail breach → PAUSED recommendation, no content
// leakage, telemetry privacy allowlist.
//
// Usage: npx tsx scripts/verify-flywheel-domain.ts
//   Requires: DATABASE_URL in environment (Neon pooled connection string).
//   Exit 0: all scenarios pass.
//   Exit 1: any scenario fails, or DATABASE_URL is missing.
// ────────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { GalleryRepositoryPrisma } from "@/persistence/gallery-repository-prisma";
import {
  ExperimentRegistryPrisma,
  FlywheelEventRepositoryPrisma,
} from "@/persistence/flywheel-repository-prisma";
import { FlywheelEventIngestor } from "@/domain/flywheel/flywheel-event-ingestor";
import { RankingEngine } from "@/domain/flywheel/ranking-engine";
import { SuggestionStrengthAdjuster } from "@/domain/flywheel/suggestion-strength-adjuster";
import { ExperimentService } from "@/domain/flywheel/experiment-service";
import type { FlywheelClock, FlywheelTelemetry } from "@/domain/flywheel/ports";
import type {
  ExperimentConfigInput,
  FlywheelEvent,
  FlywheelEventType,
  FlywheelTelemetryEvent,
  NewFlywheelEventInput,
  PatternSignalRecord,
} from "@/domain/flywheel/types";
import type { RankableItem, RankingParams } from "@/domain/flywheel/schemas";
import type { GalleryItem, NewGalleryItemInput } from "@/domain/curation/types";
import { createHash } from "node:crypto";

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

// ─── Test data factory ────────────────────────────────────────────────────────

const TEST_PREFIX = `FLY-${Date.now()}`;
let scenarioCounter = 0;

/** 64-hex-char SHA-256-shaped subject key (privacy: hash only). */
function hashKey(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

function makeAttribution(): NewGalleryItemInput["attribution"] {
  return {
    creatorName: `${TEST_PREFIX}-creator-${++scenarioCounter}`,
    sourceUrl: `https://example.com/fly-${TEST_PREFIX}-${scenarioCounter}.html`,
    licenseType: "EXPLICIT_PERMISSION",
    consentDate: new Date().toISOString(),
  };
}

function makeConsent(): NewGalleryItemInput["consent"] {
  return {
    tier: "PATTERN_DERIVE",
    consentedBy: "test-verify-flywheel",
    consentedAt: new Date().toISOString(),
    terms: "EXPLICIT_PERMISSION",
    expiresAt: null,
  };
}

function makeItemInput(overrides?: Partial<NewGalleryItemInput>): NewGalleryItemInput {
  return {
    title: `${TEST_PREFIX}-item-${++scenarioCounter}`,
    creatorRole: "Test Artist",
    styleTags: ["minimalist", "editorial"],
    attribution: makeAttribution(),
    consent: makeConsent(),
    ...overrides,
  };
}

function makeEventInput(overrides?: Partial<NewFlywheelEventInput>): NewFlywheelEventInput {
  return {
    eventType: "SAVE",
    subjectKey: hashKey(`subject-${++scenarioCounter}`),
    itemId: null,
    patternSignalId: null,
    occurredAt: new Date().toISOString(),
    idempotencyKey: `${TEST_PREFIX}-idem-${scenarioCounter}`,
    payload: {},
    ...overrides,
  };
}

function makeExperimentConfig(overrides?: Partial<ExperimentConfigInput>): ExperimentConfigInput {
  return {
    name: `${TEST_PREFIX}-experiment-${++scenarioCounter}`,
    description: null,
    variants: [
      { key: "control", weight: 0.5 },
      { key: "treatment", weight: 0.5 },
    ],
    guardrailConfig: {
      maxOriginalityDeviation: 0.1,
      minDiversity: 0.3,
      maxAttributionViolations: 0,
    },
    ...overrides,
  };
}

// ─── Cleanup tracking ─────────────────────────────────────────────────────────

const testItemRecords: TestItemRecord[] = [];
const createdEventIds: string[] = [];
const createdExperimentIds: string[] = [];
const createdSignalIds: string[] = [];

async function cleanup(): Promise<void> {
  const itemIds = testItemRecords.map((r) => r.itemId);
  const attributionIds = testItemRecords.map((r) => r.attributionId);
  const consentRecordIds = testItemRecords.map((r) => r.consentRecordId);

  console.log(
    `\nCleaning up ${testItemRecords.length} fixture item(s) + flywheel rows...`,
  );

  try {
    // Child-before-parent order (all FK relations are onDelete: Restrict).
    if (createdExperimentIds.length > 0) {
      await prisma.experimentAssignment.deleteMany({
        where: { experimentId: { in: createdExperimentIds } },
      });
    }
    if (itemIds.length > 0) {
      await prisma.signalScore.deleteMany({
        where: { patternSignalId: { in: createdSignalIds } },
      });
      await prisma.rankingScore.deleteMany({ where: { itemId: { in: itemIds } } });
    }
    if (createdEventIds.length > 0) {
      await prisma.behaviorEvent.deleteMany({ where: { id: { in: createdEventIds } } });
    }
    if (createdExperimentIds.length > 0) {
      await prisma.experiment.deleteMany({ where: { id: { in: createdExperimentIds } } });
    }
    if (createdSignalIds.length > 0) {
      await prisma.patternSignal.deleteMany({ where: { id: { in: createdSignalIds } } });
    }
    if (itemIds.length > 0) {
      await prisma.galleryItem.deleteMany({ where: { id: { in: itemIds } } });
    }
    if (consentRecordIds.length > 0) {
      await prisma.consentRecord.deleteMany({ where: { id: { in: consentRecordIds } } });
    }
    if (attributionIds.length > 0) {
      await prisma.attribution.deleteMany({ where: { id: { in: attributionIds } } });
    }

    // Flywheel-only rows (identified by TEST_PREFIX).
    await prisma.behaviorEvent.deleteMany({
      where: { idempotencyKey: { startsWith: TEST_PREFIX } },
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
  const item = await repo.ingest(input ?? makeItemInput());
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

function toRankable(item: GalleryItem, quality: number, daysAgo: number): RankableItem {
  return {
    id: item.id,
    title: item.title,
    creatorId: `creator-${item.id}`,
    creatorName: item.title,
    status: "ACCEPTED",
    qualityScore: quality,
    acceptedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  };
}

async function runScenarios(): Promise<void> {
  // ── Wire up repositories, services, and observability fakes ──────────────────
  const galleryRepo = new GalleryRepositoryPrisma();
  const eventRepo = new FlywheelEventRepositoryPrisma();
  const experimentRegistry = new ExperimentRegistryPrisma();

  const clock: FlywheelClock = { now: () => new Date().toISOString() };
  const telemetryEvents: FlywheelTelemetryEvent[] = [];
  const telemetry: FlywheelTelemetry = {
    emit(event: FlywheelTelemetryEvent) {
      telemetryEvents.push(event);
    },
  };

  const ingestor = new FlywheelEventIngestor(eventRepo, clock, telemetry);
  const rankingEngine = new RankingEngine();
  const adjuster = new SuggestionStrengthAdjuster();
  const experimentService = new ExperimentService(experimentRegistry, clock, telemetry);

  const createdEventIdsForRun: string[] = [];

  // ── S1: Ingest valid events (all 8 event types) → recorded ─────────────────
  {
    const fixture = await ingestFixtureItem(galleryRepo);
    const types: FlywheelEventType[] = [
      "IMPRESSION",
      "OPEN",
      "SAVE",
      "COLLECTION_ADD",
      "MCP_RETRIEVAL_USE",
      "DISMISSAL",
      "REFORMULATION",
      "MODERATOR_ACCEPTANCE",
    ];
    let allRecorded = true;
    for (const t of types) {
      const result = await ingestor.ingest(
        makeEventInput({ eventType: t, itemId: fixture.id }),
      );
      if (!result.ok || result.duplicated) allRecorded = false;
      else createdEventIdsForRun.push(result.event.id);
    }
    createdEventIds.push(...createdEventIdsForRun);
    assert(allRecorded, "S1: all 8 event types ingested and recorded", `recorded ${types.length}`);
  }

  // ── S2: Duplicate idempotencyKey → single record ───────────────────────────
  {
    const fixture = await ingestFixtureItem(galleryRepo);
    const input = makeEventInput({
      eventType: "SAVE",
      itemId: fixture.id,
      idempotencyKey: `${TEST_PREFIX}-idem-s2`,
    });
    const first = await ingestor.ingest(input);
    const second = await ingestor.ingest(input);
    const stored = await eventRepo.findEventByIdempotencyKey(input.idempotencyKey);
    assert(
      first.ok === true &&
        second.ok === true &&
        !first.duplicated &&
        second.duplicated &&
        stored !== null &&
        first.ok &&
        second.ok &&
        first.event.id === second.event.id,
      "S2: duplicate idempotencyKey persists a single record",
      `first=${first.ok && first.duplicated} second=${second.ok && second.duplicated}`,
    );
  }

  // ── S3: Invalid input → typed error (never throws) ─────────────────────────
  {
    const badInput = makeEventInput({ subjectKey: "not-a-hash", itemId: "x" });
    const result = await ingestor.ingest(badInput);
    assert(
      result.ok === false && result.error === "VALIDATION_FAILED",
      "S3: invalid input returns typed VALIDATION_FAILED, does not throw",
      `ok=${result.ok}`,
    );
  }

  // ── S4: Ranking determinism ─────────────────────────────────────────────────
  {
    const items: RankableItem[] = [];
    for (let i = 0; i < 3; i++) {
      const fixture = await ingestFixtureItem(galleryRepo);
      items.push(toRankable(fixture, 0.8 - i * 0.1, i + 1));
    }
    const params: RankingParams = {
      wQuality: 1,
      wRecency: 1,
      wUtility: 1,
      saturationLambda: 0.01,
      maxItemsPerCreator: 2,
      topN: 10,
    };
    const utility = new Map(items.map((it, idx) => [it.id, (idx + 1) * 10]));
    const now = new Date().toISOString();
    const r1 = rankingEngine.computeRanking(items, utility, params, now);
    const r2 = rankingEngine.computeRanking(items, utility, params, now);
    assert(
      JSON.stringify(r1) === JSON.stringify(r2),
      "S4: ranking is deterministic (same input → same output)",
    );
  }

  // ── S5: Saturation decay (old popular < fresh) ─────────────────────────────
  {
    const oldItem = await ingestFixtureItem(galleryRepo);
    const freshItem = await ingestFixtureItem(galleryRepo);
    const now = new Date().toISOString();
    const old = toRankable(oldItem, 0.9, 365); // popular but 1 year old
    const fresh = toRankable(freshItem, 0.5, 0); // fresh, lower quality
    const params: RankingParams = {
      wQuality: 1,
      wRecency: 2,
      wUtility: 0,
      saturationLambda: 0.01,
      maxItemsPerCreator: 2,
      topN: 10,
    };
    const results = rankingEngine.computeRanking([old, fresh], new Map(), params, now);
    const freshRank = results.findIndex((r) => r.itemId === fresh.id);
    const oldRank = results.findIndex((r) => r.itemId === old.id);
    assert(
      freshRank !== -1 && oldRank !== -1 && freshRank < oldRank,
      "S5: saturation decay — fresh item outranks an old popular one",
      `fresh=${freshRank} old=${oldRank}`,
    );
  }

  // ── S6: R2 diversity (≥2 creators in output when ≥2 exist) ────────────────
  {
    const itemA = await ingestFixtureItem(galleryRepo);
    const itemB = await ingestFixtureItem(galleryRepo);
    const itemC = await ingestFixtureItem(galleryRepo);
    const items: RankableItem[] = [
      toRankable(itemA, 0.95, 1),
      toRankable(itemB, 0.94, 1),
      toRankable(itemC, 0.93, 1),
    ];
    // Ensure ≥2 distinct creators by overriding creatorId.
    items[1] = { ...items[1], creatorId: `${items[1].creatorId}-other` };
    const params: RankingParams = {
      wQuality: 1,
      wRecency: 0,
      wUtility: 0,
      saturationLambda: 0.01,
      maxItemsPerCreator: 2,
      topN: 10,
    };
    const results = rankingEngine.computeRanking(items, new Map(), params, new Date().toISOString());
    const creators = new Set(results.map((r) => r.creatorId));
    assert(
      creators.size >= 2,
      "S6: ranking output contains ≥2 distinct creators (R2)",
      `creators=${creators.size}`,
    );
  }

  // ── S7: Suggestion R2 floor (signal with <3 items → strength 0) ────────────
  {
    const signal: PatternSignalRecord = {
      id: `signal-${TEST_PREFIX}-s7`,
      patternType: "STYLE",
      eligibleItemCount: 2, // only 2 items → below floor
      distinctCreatorCount: 1,
    };
    const scores = adjuster.adjust(
      [signal],
      [],
      { minEligibleItems: 3, minDistinctCreators: 2, maxUplift: 0.5, maxSuggestionStrength: 1 },
      new Date().toISOString(),
    );
    assert(
      scores[0].suggestionStrength === 0 && scores[0].explanationReasonCode === "PATTERN_FREQUENCY",
      "S7: below-floor signal → strength 0 with PATTERN_FREQUENCY reason",
      `strength=${scores[0].suggestionStrength}`,
    );
  }

  // ── S8: Suggestion uplift bounded ──────────────────────────────────────────
  {
    const signal: PatternSignalRecord = {
      id: `signal-${TEST_PREFIX}-s8`,
      patternType: "STYLE",
      eligibleItemCount: 3,
      distinctCreatorCount: 2,
    };
    const events: FlywheelEvent[] = [
      {
        id: `${TEST_PREFIX}-ev-s8-1`,
        eventType: "MCP_RETRIEVAL_USE",
        subjectKey: hashKey("s8"),
        itemId: null,
        patternSignalId: signal.id,
        experimentId: null,
        variant: null,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `${TEST_PREFIX}-idem-s8-1`,
        payload: {},
        createdAt: new Date().toISOString(),
      },
      {
        id: `${TEST_PREFIX}-ev-s8-2`,
        eventType: "REFORMULATION",
        subjectKey: hashKey("s8"),
        itemId: null,
        patternSignalId: signal.id,
        experimentId: null,
        variant: null,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `${TEST_PREFIX}-idem-s8-2`,
        payload: {},
        createdAt: new Date().toISOString(),
      },
    ];
    const scores = adjuster.adjust(
      [signal],
      events,
      { minEligibleItems: 3, minDistinctCreators: 2, maxUplift: 0.5, maxSuggestionStrength: 1 },
      new Date().toISOString(),
    );
    assert(
      scores[0].suggestionStrength > 0.4 && scores[0].suggestionStrength <= 1,
      "S8: suggestion uplift bounded within [0, maxSuggestionStrength]",
      `strength=${scores[0].suggestionStrength}`,
    );
  }

  // ── S9: Experiment deterministic assignment (same subject twice) ──────────
  {
    const config = makeExperimentConfig();
    const registered = await experimentService.register(config);
    if (!registered.ok) {
      fail("S9: experiment registration failed", registered.issues?.join("; "));
    } else {
      createdExperimentIds.push(registered.experiment.id);
      const subject = hashKey("s9-subject");
      const a1 = await experimentService.assign(registered.experiment.id, subject);
      const a2 = await experimentService.assign(registered.experiment.id, subject);
      assert(
        a1.ok === true && a2.ok === true && a1.assignment.variant === a2.assignment.variant,
        "S9: deterministic assignment — same subject always gets same variant",
        `v1=${a1.ok && a1.assignment.variant} v2=${a2.ok && a2.assignment.variant}`,
      );
    }
  }

  // ── S10: Guardrail breach → PAUSED recommendation ─────────────────────────
  {
    const config = makeExperimentConfig();
    const registered = await experimentService.register(config);
    if (!registered.ok) {
      fail("S10: experiment registration failed", registered.issues?.join("; "));
    } else {
      createdExperimentIds.push(registered.experiment.id);
      const evalResult = await experimentService.evaluateGuardrails(registered.experiment.id, {
        originalityDeviation: 0.5, // > maxOriginalityDeviation 0.1
        diversityIndex: 0.9,
        attributionViolations: 0,
      });
      assert(
        evalResult.recommendation === "PAUSED" &&
          evalResult.breached.includes("originality_deviation"),
        "S10: guardrail breach → PAUSED recommendation (no auto-disable)",
        `recommendation=${evalResult.recommendation} breached=${evalResult.breached.join(",")}`,
      );
    }
  }

  // ── S11: No content leakage (output JSON lacks contentBlob/structureJSON) ─
  {
    const fixture = await ingestFixtureItem(galleryRepo);
    const result = await ingestor.ingest(
      makeEventInput({ eventType: "OPEN", itemId: fixture.id }),
    );
    if (!result.ok) {
      fail("S11: ingest failed unexpectedly", result.issues?.join("; "));
    } else {
      createdEventIds.push(result.event.id);
      const stored = await eventRepo.findEventByIdempotencyKey(result.event.idempotencyKey);
      const serialized = JSON.stringify(stored ?? result.event);
      assert(
        !serialized.includes("contentBlob") &&
          !serialized.includes("structureJSON") &&
          !serialized.includes("sourceUrl") &&
          !serialized.includes("prompt"),
        "S11: persisted/output event carries no content blobs or URLs",
      );
    }
  }

  // ── S12: Telemetry privacy (captured events allowlist) ────────────────────
  {
    const allowedKeys = new Set([
      "type",
      "eventType",
      "timestamp",
      "reason",
      "idempotencyKey",
      "itemCount",
      "signalCount",
      "experimentId",
      "variant",
      "breached",
    ]);
    const forbidden = ["contentBlob", "structureJSON", "sourceUrl", "prompt", "payload"];
    const keys: string[] = [];
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (value !== null && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          keys.push(k);
          walk(v);
        }
      }
    };
    for (const ev of telemetryEvents) walk(ev);
    const leak = keys.some((k) => !allowedKeys.has(k));
    const serialized = JSON.stringify(telemetryEvents);
    const hasForbidden = forbidden.some((f) => serialized.includes(f));
    assert(
      !leak && !hasForbidden,
      "S12: all telemetry events use allowlisted keys (ids/enums/counts only)",
      `keys=[${[...new Set(keys)].join(",")}] leak=${leak} forbidden=${hasForbidden}`,
    );
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
      "      Set DATABASE_URL in your .env file and re-run: npx tsx scripts/verify-flywheel-domain.ts",
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
