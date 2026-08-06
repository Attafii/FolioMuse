// ─── SuggestionStrengthAdjuster (ADR-0004 D2/D3/D5, R2/R5) ───────────────
// Adjusts PatternSignal-derived section-intelligence suggestion strength.
//   - R2 floor (ADR-0003 D8): only signals with eligibleItemCount >= 3 AND
//     distinctCreatorCount >= 2 contribute; below-floor signals get strength 0.
//   - Behavior uplift: MCP_RETRIEVAL_USE / REFORMULATION / SAVE events
//     targeting the signal add positive weight; DISMISSAL dampens.
//   - Saturation: uplift is bounded (maxUplift) so one popular pattern cannot
//     dominate the suggestion set (anti popularity lock-in).
//   - Explanation reason codes on every adjusted suggestion (R7).
//   - NEVER copies gallery item fields/content into suggestions (R2/R5) —
//     reads PatternSignal records only, returns new SignalScoreRecords
//     (ADR-0002 no rewrite of the signal itself).
// Pure + deterministic. NO Prisma/Next imports (AGENTS.md §7).

import { EVENT_WEIGHTS } from "./flywheel-event-ingestor";
import type {
  FlywheelEvent,
  PatternSignalRecord,
  SignalScoreRecord,
  SuggestionParams,
} from "./types";

export interface SuggestionStrengthAdjusterPort {
  adjust(
    signals: PatternSignalRecord[],
    events: FlywheelEvent[],
    params: SuggestionParams,
    nowIso: string,
  ): SignalScoreRecord[];
}

export class SuggestionStrengthAdjuster implements SuggestionStrengthAdjusterPort {
  adjust(
    signals: PatternSignalRecord[],
    events: FlywheelEvent[],
    params: SuggestionParams,
    nowIso: string,
  ): SignalScoreRecord[] {
    // Aggregate behavior per signal.
    const behaviorBySignal = new Map<string, number>();
    for (const event of events) {
      if (!event.patternSignalId) continue;
      const weight = EVENT_WEIGHTS[event.eventType];
      if (weight === undefined) continue;
      behaviorBySignal.set(
        event.patternSignalId,
        (behaviorBySignal.get(event.patternSignalId) ?? 0) + weight,
      );
    }

    const scores: SignalScoreRecord[] = [];
    for (const signal of signals) {
      // R2 floor: below-floor signals contribute zero (ADR-0003 D8).
      if (
        signal.eligibleItemCount < params.minEligibleItems ||
        signal.distinctCreatorCount < params.minDistinctCreators
      ) {
        scores.push({
          patternSignalId: signal.id,
          suggestionStrength: 0,
          explanationReasonCode: "PATTERN_FREQUENCY",
          lastComputedAt: nowIso,
        });
        continue;
      }

      const rawBehavior = behaviorBySignal.get(signal.id) ?? 0;
      // Base strength from the aggregated pattern frequency (bounded).
      const baseStrength = Math.min(
        params.maxSuggestionStrength,
        0.25 + 0.05 * Math.min(10, signal.eligibleItemCount),
      );
      // Uplift: positive behavior raises strength, bounded by maxUplift.
      const uplift = rawBehavior > 0 ? Math.min(params.maxUplift, rawBehavior / 20) : 0;
      // Dismissals dampen (rawBehavior is negative when dismissals dominate).
      const dampening = rawBehavior < 0 ? Math.min(0.2, -rawBehavior / 30) : 0;

      const strength = Math.max(
        0,
        Math.min(params.maxSuggestionStrength, baseStrength + uplift - dampening),
      );

      scores.push({
        patternSignalId: signal.id,
        suggestionStrength: strength,
        explanationReasonCode: "PATTERN_FREQUENCY",
        lastComputedAt: nowIso,
      });
    }
    return scores;
  }
}
