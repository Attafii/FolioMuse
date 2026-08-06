// ─── Flywheel Contract Tests (ADR-0004, ADR-0002 D7, ADR-0003 D8) ────────
// DB-free contract surface: schemas, telemetry privacy allowlist,
// idempotency, R2 diversity, determinism. Mirrors the provenance
// ports-contract test style (src/domain/provenance/__tests__/ports-contract.test.ts).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  FlywheelEventTypeSchema,
  NewFlywheelEventInputSchema,
  SubjectKeySchema,
} from "@/domain/flywheel/schemas";
import { FlywheelEventIngestor } from "@/domain/flywheel/flywheel-event-ingestor";
import { RankingEngine } from "@/domain/flywheel/ranking-engine";
import { ExperimentService } from "@/domain/flywheel/experiment-service";
import {
  FakeFlywheelClock,
  InMemoryExperimentRegistry,
  InMemoryFlywheelEventRepository,
  SpyFlywheelTelemetry,
  SUBJECT_A,
  SUBJECT_B,
  TS,
  hashKey,
  makeExperimentConfig,
  makeFlywheelEventInput,
} from "@/domain/flywheel/__tests__/flywheel-test-fakes";
import type { FlywheelEventType } from "@/domain/flywheel/schemas";
import type { RankableItem } from "@/domain/flywheel/schemas";
import type { RankingParams } from "@/domain/flywheel/schemas";

// ─── 1. Schema contracts ─────────────────────────────────────────────────

describe("flywheel schema contracts", () => {
  const EVENT_TYPES: FlywheelEventType[] = [
    "IMPRESSION",
    "OPEN",
    "SAVE",
    "COLLECTION_ADD",
    "MCP_RETRIEVAL_USE",
    "DISMISSAL",
    "REFORMULATION",
    "MODERATOR_ACCEPTANCE",
  ];

  it("every FlywheelEventType is covered by the enum schema", () => {
    // Every known event type parses; the enum is exhaustive at the type level
    // (adding a type to the union forces this list to extend or the
    // FlywheelEventType assignment below fails to typecheck).
    for (const t of EVENT_TYPES) {
      expect(FlywheelEventTypeSchema.safeParse(t).success).toBe(true);
    }
    // Unknown event types are rejected.
    expect(FlywheelEventTypeSchema.safeParse("WIDGET_CLICK").success).toBe(false);
  });

  it("NewFlywheelEventInputSchema rejects nested content objects (ADR-0002 D7)", () => {
    const withNested = {
      ...makeFlywheelEventInput(),
      payload: { contentBlob: { html: "<p>secret</p>" } },
    };
    const parsed = NewFlywheelEventInputSchema.safeParse(withNested);
    expect(parsed.success).toBe(false);
  });

  it("subjectKey must be a 64-char SHA-256 hex digest", () => {
    expect(SubjectKeySchema.safeParse(hashKey("ok")).success).toBe(true);
    expect(SubjectKeySchema.safeParse("not-a-hash").success).toBe(false);
    expect(SubjectKeySchema.safeParse("A".repeat(64)).success).toBe(false); // uppercase rejected
    expect(SubjectKeySchema.safeParse("a".repeat(63)).success).toBe(false); // wrong length
  });

  it("MODERATOR_ACCEPTANCE requires itemId", () => {
    const missingItemId = makeFlywheelEventInput({
      eventType: "MODERATOR_ACCEPTANCE",
      itemId: null,
    });
    const parsed = NewFlywheelEventInputSchema.safeParse(missingItemId);
    expect(parsed.success).toBe(false);
  });
});

// ─── 2. Telemetry privacy allowlist contract ─────────────────────────────

describe("flywheel telemetry privacy contract", () => {
  // Allowlist of every permitted telemetry key (ADR-0004 D3): ids/enums/counts
  // only. Content-bearing keys are forbidden anywhere in captured events.
  const ALLOWED_KEYS = new Set([
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
  const FORBIDDEN = ["contentBlob", "structureJSON", "sourceUrl", "prompt", "payload"];

  function walkKeys(value: unknown, path: string, found: string[]): void {
    if (Array.isArray(value)) {
      value.forEach((v, i) => walkKeys(v, `${path}[${i}]`, found));
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        found.push(`${path}.${k}`);
        walkKeys(v, `${path}.${k}`, found);
      }
    }
  }

  it("captured telemetry from ingest+ranking+experiment contains only allowlisted keys", async () => {
    const telemetry = new SpyFlywheelTelemetry();
    const repo = new InMemoryFlywheelEventRepository();
    const clock = new FakeFlywheelClock(TS);
    const ingestor = new FlywheelEventIngestor(repo, clock, telemetry);

    // Ingest valid + invalid events.
    await ingestor.ingest(makeFlywheelEventInput());
    await ingestor.ingest({
      ...makeFlywheelEventInput({ idempotencyKey: "idem-dup-1" }),
      subjectKey: "bad",
    });

    // Ranking.
    const engine = new RankingEngine();
    const item: RankableItem = {
      id: "i1",
      title: "t",
      creatorId: "c1",
      creatorName: "c",
      status: "ACCEPTED",
      qualityScore: 0.9,
      acceptedAt: TS,
    };
    const params: RankingParams = {
      wQuality: 1,
      wRecency: 1,
      wUtility: 1,
      saturationLambda: 0.01,
      maxItemsPerCreator: 2,
      topN: 10,
    };
    engine.computeRanking([item], new Map([["i1", 10]]), params, TS);

    // Experiment register + assign + guardrail breach.
    const registry = new InMemoryExperimentRegistry();
    const svc = new ExperimentService(registry, clock, telemetry);
    const reg = await svc.register(makeExperimentConfig());
    if (reg.ok) {
      await svc.assign(reg.experiment.id, SUBJECT_A);
      await svc.evaluateGuardrails(reg.experiment.id, {
        originalityDeviation: 0.9,
        diversityIndex: 0.1,
        attributionViolations: 5,
      });
    }

    const keys: string[] = [];
    for (const ev of telemetry.events) walkKeys(ev, "", keys);
    for (const key of keys) {
      const leaf = key.split(".").pop() ?? "";
      expect(ALLOWED_KEYS.has(leaf)).toBe(true);
    }
    for (const f of FORBIDDEN) {
      expect(JSON.stringify(telemetry.events)).not.toContain(f);
    }
    expect(telemetry.hasContentLeak()).toBe(false);
  });
});

// ─── 3. Idempotency contract ─────────────────────────────────────────────

describe("flywheel idempotency contract", () => {
  it("ingest twice with same idempotencyKey persists exactly one event", async () => {
    const repo = new InMemoryFlywheelEventRepository();
    const telemetry = new SpyFlywheelTelemetry();
    const ingestor = new FlywheelEventIngestor(
      repo,
      new FakeFlywheelClock(TS),
      telemetry,
    );
    const input = makeFlywheelEventInput({ idempotencyKey: "idem-unique-1" });

    const first = await ingestor.ingest(input);
    const second = await ingestor.ingest(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.duplicated).toBe(false);
    expect(second.duplicated).toBe(true);
    expect(first.event.id).toBe(second.event.id);
    expect((await repo.listEvents()).length).toBe(1);
  });
});

// ─── 4. R2 diversity contract ────────────────────────────────────────────

describe("flywheel R2 diversity contract (ADR-0003 D8)", () => {
  function makeItems(): RankableItem[] {
    const mk = (id: string, creatorId: string, q: number): RankableItem => ({
      id,
      title: `t-${id}`,
      creatorId,
      creatorName: `creator-${creatorId}`,
      status: "ACCEPTED",
      qualityScore: q,
      acceptedAt: TS,
    });
    return [
      mk("a", "c1", 0.95),
      mk("b", "c1", 0.94),
      mk("c", "c1", 0.93),
      mk("d", "c2", 0.9),
      mk("e", "c3", 0.89),
    ];
  }

  it("ranking output includes >=2 distinct creators when >=2 exist in eligible set", () => {
    const engine = new RankingEngine();
    const params: RankingParams = {
      wQuality: 1,
      wRecency: 1,
      wUtility: 1,
      saturationLambda: 0.01,
      maxItemsPerCreator: 2,
      topN: 20,
    };
    const results = engine.computeRanking(
      makeItems(),
      new Map([["a", 1], ["b", 2], ["c", 3], ["d", 4], ["e", 5]]),
      params,
      TS,
    );
    const creators = new Set(results.map((r) => r.creatorId));
    expect(creators.size).toBeGreaterThanOrEqual(2);
    // Output carries R7 reason codes on every result.
    for (const r of results) {
      expect(r.explanationReasonCode).toBeTruthy();
    }
  });
});

// ─── 5. Determinism contract ─────────────────────────────────────────────

describe("flywheel determinism contract", () => {
  it("ranking is a pure function: same input -> byte-identical output", () => {
    const engine = new RankingEngine();
    const mk = (id: string, creatorId: string, q: number): RankableItem => ({
      id,
      title: `t-${id}`,
      creatorId,
      creatorName: `c-${creatorId}`,
      status: "ACCEPTED",
      qualityScore: q,
      acceptedAt: TS,
    });
    const items = [mk("a", "c1", 0.9), mk("b", "c2", 0.8), mk("c", "c3", 0.7)];
    const utility = new Map([["a", 10], ["b", 20], ["c", 30]]);
    const params: RankingParams = {
      wQuality: 1,
      wRecency: 1,
      wUtility: 1,
      saturationLambda: 0.01,
      maxItemsPerCreator: 2,
      topN: 10,
    };
    const r1 = engine.computeRanking(items, utility, params, TS);
    const r2 = engine.computeRanking(items, utility, params, TS);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("experiment assignment is deterministic: same subject -> same variant", async () => {
    const registry = new InMemoryExperimentRegistry();
    const svc = new ExperimentService(
      registry,
      new FakeFlywheelClock(TS),
      new SpyFlywheelTelemetry(),
    );
    const reg = await svc.register(makeExperimentConfig());
    if (!reg.ok) throw new Error("setup failed");
    const a1 = await svc.assign(reg.experiment.id, SUBJECT_A);
    const a2 = await svc.assign(reg.experiment.id, SUBJECT_A);
    const b1 = await svc.assign(reg.experiment.id, SUBJECT_B);
    expect(a1.ok && a2.ok).toBe(true);
    if (!a1.ok || !a2.ok) return;
    expect(a1.assignment.variant).toBe(a2.assignment.variant);
    // Different subject may land on a different variant, but always a valid key.
    if (b1.ok) {
      expect(reg.experiment.variants.map((v) => v.key)).toContain(b1.assignment.variant);
    }
  });
});

// ─── Domain boundary: no Prisma/Next imports (AGENTS.md §7) ──────────────

describe("flywheel domain layer boundary", () => {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const flywheelDir = resolve(thisDir, "..");

  it("ports/types/schemas contain no Prisma or Next imports", () => {
    for (const file of ["ports.ts", "types.ts", "schemas.ts"]) {
      const source = readFileSync(resolve(flywheelDir, file), "utf-8");
      expect(source).not.toMatch(/@prisma\/client/);
      expect(source).not.toMatch(/@\/generated\/prisma/);
      expect(source).not.toMatch(/from ["']next\//);
      expect(source).not.toMatch(/require\(["']@prisma/);
    }
  });

  it("ports.ts exposes no content-bearing or raw-capture types", () => {
    const source = readFileSync(resolve(flywheelDir, "ports.ts"), "utf-8");
    expect(source).not.toMatch(/contentBlob/);
    expect(source).not.toMatch(/rawSource/);
    expect(source).not.toMatch(/structureJSON/);
    expect(source).not.toMatch(/fullContent/);
  });
});
