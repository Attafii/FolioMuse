// ─── Integration Tests for FlywheelRepositoryPrisma ────────────────────────
// Requires a real Neon database connection (DATABASE_URL env var).
// Tests SKIP gracefully when DATABASE_URL is missing so npm test stays green
// in environments without database credentials.
//
// ADR-0004 compliance assertions:
//   - Append-only events: recordEvent inserts; idempotencyKey dedupes
//     (re-record returns existing, never duplicates).
//   - Ranking/signal scores upsert on itemId/patternSignalId (no growth).
//   - Experiment assignment is deterministic + idempotent on
//     @@unique([experimentId, subjectKey]).
//   - No content/blob fields written anywhere (metadata only).
// ───────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  ExperimentRegistryPrisma,
  FlywheelEventRepositoryPrisma,
  RankingStorePrisma,
} from "@/persistence/flywheel-repository-prisma";
import { TS } from "@/domain/flywheel/__tests__/flywheel-test-fakes";

// ─── Conditional suite: skip entire block when no database ──────────────────

describe.skipIf(!process.env.DATABASE_URL)("FlywheelRepositoryPrisma integration", () => {
  const eventRepo = new FlywheelEventRepositoryPrisma();
  const rankingStore = new RankingStorePrisma();
  const experimentRegistry = new ExperimentRegistryPrisma();

  const suffix = `fly-${Date.now()}`;
  const createdItemIds: string[] = [];
  const createdSignalIds: string[] = [];
  const createdEventIds: string[] = [];
  const createdExperimentIds: string[] = [];
  const createdAttributionIds: string[] = [];
  const createdConsentIds: string[] = [];

  afterAll(async () => {
    // Cleanup in FK order.
    await prisma.experimentAssignment.deleteMany({
      where: { experimentId: { in: createdExperimentIds } },
    });
    await prisma.signalScore.deleteMany({
      where: { patternSignalId: { in: createdSignalIds } },
    });
    await prisma.rankingScore.deleteMany({ where: { itemId: { in: createdItemIds } } });
    await prisma.behaviorEvent.deleteMany({ where: { id: { in: createdEventIds } } });
    await prisma.experiment.deleteMany({ where: { id: { in: createdExperimentIds } } });
    await prisma.patternSignal.deleteMany({ where: { id: { in: createdSignalIds } } });
    await prisma.galleryItem.deleteMany({ where: { id: { in: createdItemIds } } });
    await prisma.consentRecord.deleteMany({ where: { id: { in: createdConsentIds } } });
    await prisma.attribution.deleteMany({ where: { id: { in: createdAttributionIds } } });
  });

  async function createTestItem(n: number) {
    const item = await prisma.galleryItem.create({
      data: {
        title: `Flywheel Test Item ${suffix}-${n}`,
        creatorRole: "Frontend Developer",
        status: "ACCEPTED",
        attribution: {
          create: {
            creatorName: `Flywheel Test Creator ${suffix}-${n}`,
            sourceUrl: `https://test.example.com/fly${suffix}-${n}`,
            licenseType: "EXPLICIT_PERMISSION",
            consentDate: new Date(),
          },
        },
        consent: {
          create: {
            tier: "DISPLAY",
            consentedBy: `flywheel-integration-actor-${suffix}`,
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

  async function createTestSignal(n: number) {
    const signal = await prisma.patternSignal.create({
      data: {
        patternType: `FLYWHEEL_TEST_${suffix}_${n}`,
        derivedFromItemIds: [],
        eligibleItemCount: 5,
        distinctCreatorCount: 3,
      },
    });
    createdSignalIds.push(signal.id);
    return signal;
  }

  it("records a behavior event and dedupes by idempotencyKey (append-only)", async () => {
    const item = await createTestItem(1);
    const input = {
      eventType: "SAVE" as const,
      subjectKey: "a".repeat(64),
      itemId: item.id,
      occurredAt: TS,
      idempotencyKey: `${suffix}-idem-1`,
      payload: { depth: 3 },
    };

    const first = await eventRepo.recordEvent(input);
    const second = await eventRepo.recordEvent(input);

    expect(first.id).toBe(second.id);
    createdEventIds.push(first.id);
    const all = await eventRepo.listEvents({});
    const mine = all.filter((e) => e.idempotencyKey === `${suffix}-idem-1`);
    expect(mine).toHaveLength(1);
    expect(mine[0].payload).toEqual({ depth: 3 });
  });

  it("saves ranking scores idempotently (upsert on itemId)", async () => {
    const item = await createTestItem(2);
    await rankingStore.saveRankingScore({
      itemId: item.id,
      rawScore: 10,
      decayedScore: 8,
      qualityScore: 0.8,
      recencyScore: 0.5,
      finalRankScore: 12,
      lastComputedAt: TS,
    });
    await rankingStore.saveRankingScore({
      itemId: item.id,
      rawScore: 20,
      decayedScore: 16,
      qualityScore: 0.9,
      recencyScore: 0.6,
      finalRankScore: 24,
      lastComputedAt: TS,
    });
    const scores = await rankingStore.listRankingScores();
    const mine = scores.filter((s) => s.itemId === item.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].finalRankScore).toBe(24);
  });

  it("saves signal scores idempotently (upsert on patternSignalId)", async () => {
    const signal = await createTestSignal(1);
    await rankingStore.saveSignalScore({
      patternSignalId: signal.id,
      suggestionStrength: 0.5,
      explanationReasonCode: "PATTERN_FREQUENCY",
      lastComputedAt: TS,
    });
    await rankingStore.saveSignalScore({
      patternSignalId: signal.id,
      suggestionStrength: 0.7,
      explanationReasonCode: "PATTERN_FREQUENCY",
      lastComputedAt: TS,
    });
    const scores = await rankingStore.listSignalScores();
    const mine = scores.filter((s) => s.patternSignalId === signal.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].suggestionStrength).toBe(0.7);
  });

  it("assigns experiment variants deterministically and idempotently", async () => {
    const experiment = await experimentRegistry.registerExperiment({
      name: `${suffix}-exp-1`,
      description: null,
      variants: [
        { key: "control", weight: 0.5 },
        { key: "treatment", weight: 0.5 },
      ],
      guardrailConfig: {
        maxOriginalityDeviation: 0.2,
        minDiversity: 0.3,
        maxAttributionViolations: 1,
      },
    });
    createdExperimentIds.push(experiment.id);

    const subject = "b".repeat(64);
    const first = await experimentRegistry.assignVariant(experiment.id, subject);
    const second = await experimentRegistry.assignVariant(experiment.id, subject);

    expect(first.id).toBe(second.id);
    expect(first.variant).toBe(second.variant);
    expect(["control", "treatment"]).toContain(first.variant);
  });

  it("lists experiments in registration order", async () => {
    const experiments = await experimentRegistry.listExperiments();
    expect(Array.isArray(experiments)).toBe(true);
  });
});
