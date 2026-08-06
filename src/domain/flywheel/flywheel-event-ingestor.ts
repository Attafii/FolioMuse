// ─── FlywheelEventIngestor (ADR-0004 D1/D6/D7) ───────────────────────────
// Validates and records privacy-minimized behavior events. NEVER throws on
// invalid input — returns a typed result. Idempotent by idempotencyKey.
// NO Prisma/Next imports (AGENTS.md §7).

import { NewFlywheelEventInputSchema } from "./schemas";
import type { FlywheelEvent, FlywheelEventType, NewFlywheelEventInput } from "./types";
import type { FlywheelClock, FlywheelEventRepository, FlywheelTelemetry } from "./ports";

// ─── Event weights (ADR-0004 D2) ──────────────────────────────────────────
// Action outweighs passive views (success-metrics.md lists raw page views /
// time-on-gallery as NON-metrics). Configurable constants — kept in the
// domain, never persisted in the DB.
export const EVENT_WEIGHTS: Record<FlywheelEventType, number> = {
  IMPRESSION: 1,
  OPEN: 2,
  SAVE: 3,
  COLLECTION_ADD: 4,
  MCP_RETRIEVAL_USE: 5,
  DISMISSAL: -3,
  REFORMULATION: 5,
  MODERATOR_ACCEPTANCE: 6,
};

export function eventWeight(eventType: FlywheelEventType): number {
  return EVENT_WEIGHTS[eventType];
}

// ─── Typed result ─────────────────────────────────────────────────────────

export type IngestResult =
  | { ok: true; event: FlywheelEvent; duplicated: boolean }
  | { ok: false; error: "VALIDATION_FAILED"; issues: string[] };

// ─── Implementation ───────────────────────────────────────────────────────

export class FlywheelEventIngestor {
  constructor(
    private readonly repository: FlywheelEventRepository,
    private readonly clock: FlywheelClock,
    private readonly telemetry: FlywheelTelemetry,
  ) {}

  async ingest(input: NewFlywheelEventInput): Promise<IngestResult> {
    const parsed = NewFlywheelEventInputSchema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      this.telemetry.emit({
        type: "EVENT_VALIDATION_FAILED",
        reason: issues.join("; ").slice(0, 500),
        timestamp: this.clock.now(),
      });
      return { ok: false, error: "VALIDATION_FAILED", issues };
    }

    // Idempotent write: same idempotencyKey returns the existing record.
    const existing = await this.repository.findEventByIdempotencyKey(parsed.data.idempotencyKey);
    if (existing) {
      this.telemetry.emit({
        type: "EVENT_DEDUPED",
        idempotencyKey: existing.idempotencyKey,
        timestamp: this.clock.now(),
      });
      return { ok: true, event: existing, duplicated: true };
    }

    const event = await this.repository.recordEvent(parsed.data);
    // Privacy-minimized telemetry: enum + timestamp only, NEVER payload content.
    this.telemetry.emit({
      type: "EVENT_INGESTED",
      eventType: event.eventType,
      timestamp: this.clock.now(),
    });
    return { ok: true, event, duplicated: false };
  }
}
