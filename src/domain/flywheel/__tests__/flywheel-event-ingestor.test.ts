// ─── FlywheelEventIngestor unit tests (ADR-0004) ─────────────────────────
// TDD: happy path, invalid input → typed error, idempotent dedupe, telemetry
// privacy (no payload content in emitted events).

import { describe, expect, it } from "vitest";

import {
  EVENT_WEIGHTS,
  FlywheelEventIngestor,
  eventWeight,
} from "@/domain/flywheel/flywheel-event-ingestor";
import {
  FakeFlywheelClock,
  InMemoryFlywheelEventRepository,
  SpyFlywheelTelemetry,
  SUBJECT_A,
  TS,
  makeFlywheelEventInput,
} from "@/domain/flywheel/__tests__/flywheel-test-fakes";

describe("FlywheelEventIngestor", () => {
  it("ingests a valid event and emits privacy-minimized telemetry", async () => {
    const repo = new InMemoryFlywheelEventRepository();
    const telemetry = new SpyFlywheelTelemetry();
    const clock = new FakeFlywheelClock(TS);
    const ingestor = new FlywheelEventIngestor(repo, clock, telemetry);

    const result = await ingestor.ingest(makeFlywheelEventInput({ payload: { depth: 3 } }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.eventType).toBe("SAVE");
    expect(result.duplicated).toBe(false);
    expect(telemetry.events).toHaveLength(1);
    expect(telemetry.events[0]).toMatchObject({ type: "EVENT_INGESTED", eventType: "SAVE" });
    // Privacy: telemetry must never carry payload content.
    expect(telemetry.hasContentLeak()).toBe(false);
    expect(JSON.stringify(telemetry.events)).not.toContain("depth");
  });

  it("returns a typed error (never throws) for invalid input", async () => {
    const repo = new InMemoryFlywheelEventRepository();
    const telemetry = new SpyFlywheelTelemetry();
    const ingestor = new FlywheelEventIngestor(repo, new FakeFlywheelClock(TS), telemetry);

    const result = await ingestor.ingest(
      makeFlywheelEventInput({ subjectKey: "not-a-hash", occurredAt: "yesterday" }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("VALIDATION_FAILED");
    expect(result.issues.length).toBeGreaterThan(0);
    // Validation failure telemetry: enum reason, no payload content.
    expect(telemetry.events[0]).toMatchObject({ type: "EVENT_VALIDATION_FAILED" });
    expect(telemetry.hasContentLeak()).toBe(false);
  });

  it("dedupes by idempotencyKey and emits EVENT_DEDUPED", async () => {
    const repo = new InMemoryFlywheelEventRepository();
    const telemetry = new SpyFlywheelTelemetry();
    const ingestor = new FlywheelEventIngestor(repo, new FakeFlywheelClock(TS), telemetry);

    const input = makeFlywheelEventInput({ idempotencyKey: "same-key" });
    const first = await ingestor.ingest(input);
    const second = await ingestor.ingest(input);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.duplicated).toBe(true);
    expect(second.event.id).toBe(first.event.id);
    expect((await repo.listEvents({})).length).toBe(1);
    expect(telemetry.events.map((e) => e.type)).toEqual(["EVENT_INGESTED", "EVENT_DEDUPED"]);
  });

  it("exposes the ADR-0004 D2 event weights favoring action over views", () => {
    expect(eventWeight("IMPRESSION")).toBe(1);
    expect(eventWeight("OPEN")).toBe(2);
    expect(eventWeight("SAVE")).toBe(3);
    expect(eventWeight("COLLECTION_ADD")).toBe(4);
    expect(eventWeight("MCP_RETRIEVAL_USE")).toBe(5);
    expect(eventWeight("DISMISSAL")).toBe(-3);
    expect(eventWeight("REFORMULATION")).toBe(5);
    expect(eventWeight("MODERATOR_ACCEPTANCE")).toBe(6);
    // Actions must outweigh passive views (success-metrics non-metric).
    expect(eventWeight("SAVE")).toBeGreaterThan(eventWeight("IMPRESSION"));
    expect(EVENT_WEIGHTS.MODERATOR_ACCEPTANCE).toBeGreaterThan(eventWeight("IMPRESSION"));
  });

  it("rejects MODERATOR_ACCEPTANCE without an itemId", async () => {
    const repo = new InMemoryFlywheelEventRepository();
    const telemetry = new SpyFlywheelTelemetry();
    const ingestor = new FlywheelEventIngestor(repo, new FakeFlywheelClock(TS), telemetry);

    const result = await ingestor.ingest(
      makeFlywheelEventInput({
        eventType: "MODERATOR_ACCEPTANCE",
        itemId: null,
        patternSignalId: "sig-1",
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.includes("itemId"))).toBe(true);
  });

  it("ingests pattern-signal-scoped events without an itemId", async () => {
    const repo = new InMemoryFlywheelEventRepository();
    const telemetry = new SpyFlywheelTelemetry();
    const ingestor = new FlywheelEventIngestor(repo, new FakeFlywheelClock(TS), telemetry);

    const result = await ingestor.ingest(
      makeFlywheelEventInput({
        eventType: "REFORMULATION",
        itemId: null,
        patternSignalId: "sig-1",
        subjectKey: SUBJECT_A,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.patternSignalId).toBe("sig-1");
  });
});
