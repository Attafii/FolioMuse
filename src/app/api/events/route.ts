// ─── POST /api/events ─────────────────────────────────────────────────────
// Telemetry ingestion for the homepage flywheel wiring (plan T17).
//
// Accepts the EXACT FlywheelEvent input schema (ADR-0004 D1) — a closed
// enum vocabulary with NO page-view event. The plan's placeholder names
// ("search_submit" / "section_visible") do NOT exist in the schema; per the
// plan ("or whatever the flywheel schema supports — read it first") the UI
// maps them to IMPRESSION (surfaced results / visible sections) and OPEN
// (result opened), both item-centric and requiring itemId.
//
// Flow: JSON body → FlywheelEventIngestor (schema validation → idempotent
// record by idempotencyKey → privacy-minimized telemetry). Invalid → 400
// JSON. Valid → 202 Accepted (fire-and-forget semantics). The route never
// leaks stack traces or connection details (mirrors /api/gallery/summaries).
//
// Testability: the handler is built by createEventsPost(ingestor) so unit
// tests can inject an in-memory repository (see __tests__/route.test.ts).

import { FlywheelEventIngestor } from "@/domain/flywheel/flywheel-event-ingestor";
import type { NewFlywheelEventInput } from "@/domain/flywheel/types";
import type { FlywheelClock, FlywheelTelemetry } from "@/domain/flywheel/ports";
import { FlywheelEventRepositoryPrisma } from "@/persistence/flywheel-repository-prisma";

// Inert telemetry sink: no production telemetry transport exists yet. The
// port contract says implementations never throw (ADR-0004 D8); an inert
// sink is compositionally sufficient, mirroring the inert rebuild queue in
// the summaries route.
const inertTelemetry: FlywheelTelemetry = { emit: () => {} };

const systemClock: FlywheelClock = { now: () => new Date().toISOString() };

export function createEventsPost(ingestor: FlywheelEventIngestor) {
  return async function POST(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    const result = await ingestor.ingest(body as NewFlywheelEventInput);
    if (!result.ok) {
      return Response.json(
        { error: "validation_failed", issues: result.issues },
        { status: 400 },
      );
    }

    return Response.json(
      { ok: true, duplicated: result.duplicated, id: result.event.id },
      { status: 202 },
    );
  };
}

// Module-level singleton: the ingestor and its Prisma repository are
// stateless apart from the shared client, so constructing once is safe.
export const POST = createEventsPost(
  new FlywheelEventIngestor(
    new FlywheelEventRepositoryPrisma(),
    systemClock,
    inertTelemetry,
  ),
);
