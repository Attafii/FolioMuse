// ─── FlywheelRepositoryPrisma (ADR-0004) ──────────────────────────────────
// Translates the flywheel domain ports (src/domain/flywheel/ports.ts) into
// Prisma queries against the Neon-hosted PostgreSQL database.
//
// DESIGN NOTES:
//   - Prisma client singleton imported from src/lib/prisma.ts (Prisma 7 +
//     @prisma/adapter-neon driver adapter). Import from @/generated/prisma
//     (generated client is gitignored — AGENTS.md §5).
//   - All Prisma Date/DateTime values are mapped to ISO 8601 strings at the
//     boundary. No raw Date objects cross into the domain layer.
//   - APPEND-ONLY EVENTS (ADR-0004 D1): recordEvent only inserts; the unique
//     idempotencyKey index makes duplicate inserts a no-op (find-first-first
//     keeps it idempotent across concurrent callers).
//   - RANK METADATA ONLY: no content/blob reads anywhere (ADR-0001/0002).
//     RankingScore/SignalScore store numbers + reason codes only.
//   - DETERMINISTIC ASSIGNMENT: ExperimentAssignment is upserted on
//     @@unique([experimentId, subjectKey]) — re-assignment returns the
//     existing variant (ADR-0004 D4).
// ────────────────────────────────────────────────────────────────────────────

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import type {
  BehaviorEvent as BehaviorEventModel,
  Experiment as ExperimentModel,
  ExperimentAssignment as ExperimentAssignmentModel,
  RankingScore as RankingScoreModel,
  SignalScore as SignalScoreModel,
} from "@/generated/prisma/client";

import type {
  ExperimentRegistry,
  FlywheelEventRepository,
  RankingStore,
} from "@/domain/flywheel/ports";
import type {
  ExperimentAssignmentRecord,
  ExperimentConfigInput,
  ExperimentRecord,
  FlywheelEvent,
  FlywheelEventFilter,
  FlywheelEventType,
  NewFlywheelEventInput,
  RankingScoreRecord,
  SignalScoreRecord,
} from "@/domain/flywheel/types";

// ─── DB → Domain Mappers ────────────────────────────────────────────────────
// All DateTime columns are converted to ISO 8601 strings.

function mapDbEvent(db: BehaviorEventModel): FlywheelEvent {
  return {
    id: db.id,
    eventType: db.eventType as FlywheelEventType,
    subjectKey: db.subjectKey,
    itemId: db.itemId,
    patternSignalId: db.patternSignalId,
    experimentId: db.experimentId,
    variant: db.variant,
    occurredAt: db.occurredAt.toISOString(),
    idempotencyKey: db.idempotencyKey,
    payload: (db.payload ?? {}) as Record<string, string | number | boolean>,
    createdAt: db.createdAt.toISOString(),
  };
}

function mapDbRankingScore(db: RankingScoreModel): RankingScoreRecord {
  return {
    itemId: db.itemId,
    rawScore: db.rawScore,
    decayedScore: db.decayedScore,
    qualityScore: db.qualityScore,
    recencyScore: db.recencyScore,
    finalRankScore: db.finalRankScore,
    lastComputedAt: db.lastComputedAt.toISOString(),
  };
}

function mapDbSignalScore(db: SignalScoreModel): SignalScoreRecord {
  return {
    patternSignalId: db.patternSignalId,
    suggestionStrength: db.suggestionStrength,
    explanationReasonCode: db.explanationReasonCode as SignalScoreRecord["explanationReasonCode"],
    lastComputedAt: db.lastComputedAt.toISOString(),
  };
}

function mapDbExperiment(db: ExperimentModel): ExperimentRecord {
  const variants = (db.variants ?? []) as unknown as Array<{ key: string; weight: number }>;
  const guardrails = (db.guardrailConfig ?? {}) as unknown as ExperimentRecord["guardrailConfig"];
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    status: db.status as ExperimentRecord["status"],
    variants,
    guardrailConfig: guardrails,
    startedAt: db.startedAt ? db.startedAt.toISOString() : null,
    endedAt: db.endedAt ? db.endedAt.toISOString() : null,
    createdAt: db.createdAt.toISOString(),
  };
}

function mapDbAssignment(db: ExperimentAssignmentModel): ExperimentAssignmentRecord {
  return {
    id: db.id,
    experimentId: db.experimentId,
    subjectKey: db.subjectKey,
    variant: db.variant,
    assignedAt: db.assignedAt.toISOString(),
  };
}

// ─── Implementation ─────────────────────────────────────────────────────────

export class FlywheelEventRepositoryPrisma implements FlywheelEventRepository {
  async recordEvent(input: NewFlywheelEventInput): Promise<FlywheelEvent> {
    // Idempotent: a prior record with the same idempotencyKey is returned
    // as-is (unique index also blocks concurrent duplicate inserts).
    const existing = await prisma.behaviorEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return mapDbEvent(existing);

    const db = await prisma.behaviorEvent.create({
      data: {
        eventType: input.eventType,
        subjectKey: input.subjectKey,
        itemId: input.itemId ?? null,
        patternSignalId: input.patternSignalId ?? null,
        experimentId: input.experimentId ?? null,
        variant: input.variant ?? null,
        occurredAt: new Date(input.occurredAt),
        idempotencyKey: input.idempotencyKey,
        payload: input.payload ?? {},
      },
    });
    return mapDbEvent(db);
  }

  async findEventByIdempotencyKey(idempotencyKey: string): Promise<FlywheelEvent | null> {
    const db = await prisma.behaviorEvent.findUnique({ where: { idempotencyKey } });
    return db ? mapDbEvent(db) : null;
  }

  async listEvents(filter: FlywheelEventFilter = {}): Promise<FlywheelEvent[]> {
    const rows = await prisma.behaviorEvent.findMany({
      where: {
        ...(filter.eventType ? { eventType: filter.eventType } : {}),
        ...(filter.itemId ? { itemId: filter.itemId } : {}),
        ...(filter.patternSignalId ? { patternSignalId: filter.patternSignalId } : {}),
        ...(filter.subjectKey ? { subjectKey: filter.subjectKey } : {}),
        ...(filter.since || filter.until
          ? {
              occurredAt: {
                ...(filter.since ? { gte: new Date(filter.since) } : {}),
                ...(filter.until ? { lt: new Date(filter.until) } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(mapDbEvent);
  }
}

export class RankingStorePrisma implements RankingStore {
  async saveRankingScore(score: RankingScoreRecord): Promise<void> {
    await prisma.rankingScore.upsert({
      where: { itemId: score.itemId },
      update: {
        rawScore: score.rawScore,
        decayedScore: score.decayedScore,
        qualityScore: score.qualityScore,
        recencyScore: score.recencyScore,
        finalRankScore: score.finalRankScore,
        lastComputedAt: new Date(score.lastComputedAt),
      },
      create: {
        itemId: score.itemId,
        rawScore: score.rawScore,
        decayedScore: score.decayedScore,
        qualityScore: score.qualityScore,
        recencyScore: score.recencyScore,
        finalRankScore: score.finalRankScore,
        lastComputedAt: new Date(score.lastComputedAt),
      },
    });
  }

  async listRankingScores(): Promise<RankingScoreRecord[]> {
    const rows = await prisma.rankingScore.findMany({ orderBy: { finalRankScore: "desc" } });
    return rows.map(mapDbRankingScore);
  }

  async saveSignalScore(score: SignalScoreRecord): Promise<void> {
    await prisma.signalScore.upsert({
      where: { patternSignalId: score.patternSignalId },
      update: {
        suggestionStrength: score.suggestionStrength,
        explanationReasonCode: score.explanationReasonCode,
        lastComputedAt: new Date(score.lastComputedAt),
      },
      create: {
        patternSignalId: score.patternSignalId,
        suggestionStrength: score.suggestionStrength,
        explanationReasonCode: score.explanationReasonCode,
        lastComputedAt: new Date(score.lastComputedAt),
      },
    });
  }

  async listSignalScores(): Promise<SignalScoreRecord[]> {
    const rows = await prisma.signalScore.findMany({ orderBy: { suggestionStrength: "desc" } });
    return rows.map(mapDbSignalScore);
  }
}

export class ExperimentRegistryPrisma implements ExperimentRegistry {
  async registerExperiment(config: ExperimentConfigInput): Promise<ExperimentRecord> {
    const db = await prisma.experiment.create({
      data: {
        name: config.name,
        description: config.description ?? null,
        status: "DRAFT",
        variants: config.variants.map((v) => ({ ...v })),
        guardrailConfig: { ...config.guardrailConfig },
      },
    });
    return mapDbExperiment(db);
  }

  async getExperiment(id: string): Promise<ExperimentRecord | null> {
    const db = await prisma.experiment.findUnique({ where: { id } });
    return db ? mapDbExperiment(db) : null;
  }

  async assignVariant(
    experimentId: string,
    subjectKey: string,
  ): Promise<ExperimentAssignmentRecord> {
    // Deterministic bucketing (ADR-0004 D4): SHA-256 of experimentId:subjectKey.
    const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!experiment) throw new Error(`experiment ${experimentId} not found`);
    const variants = (experiment.variants ?? []) as Array<{ key: string; weight: number }>;
    const total = variants.reduce((acc, v) => acc + v.weight, 0);
    const digest = hash(`${experimentId}:${subjectKey}`);
    const bucket = parseInt(digest.slice(0, 4), 16) / 0xffff;
    let cumulative = 0;
    let variant = variants[0]?.key ?? "";
    for (const v of variants) {
      cumulative += v.weight / total;
      if (bucket < cumulative) {
        variant = v.key;
        break;
      }
    }

    // Idempotent assignment: @@unique([experimentId, subjectKey]) — a repeat
    // assignment returns the existing row instead of a new one.
    const db = await prisma.experimentAssignment.upsert({
      where: {
        experimentId_subjectKey: { experimentId, subjectKey },
      },
      update: {},
      create: {
        experimentId,
        subjectKey,
        variant,
      },
    });
    return mapDbAssignment(db);
  }

  async listExperiments(): Promise<ExperimentRecord[]> {
    const rows = await prisma.experiment.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(mapDbExperiment);
  }
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
