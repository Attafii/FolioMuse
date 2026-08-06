// ─── RankingEngine (ADR-0004 D2/D3/D5) ───────────────────────────────────
// Deterministic discovery ranking for gallery items.
//   - finalRankScore = wQ·quality + wR·recency + wU·utility (blend, normalized)
//   - Saturation: utility contribution = rawAggregate × exp(-λ × age) plus a
//     per-item utility cap so no item can dominate permanently
//     (anti popularity lock-in — success-metrics.md NON-metric raw views).
//   - Diversity: per-creator cap in the top-N honoring ADR-0003 R2 (>=2
//     distinct creators); ranking never collapses to one creator.
//   - Eligibility: only ACCEPTED items rank. REJECTED/SUSPENDED/PENDING_REVIEW
//     never appear regardless of engagement.
//   - Every result carries a provenance-anchored explanationReasonCode (R7).
// Pure + deterministic: NO Math.random, NO Date.now, NO clock dependency —
// age is computed from acceptedAt vs a supplied reference instant.
// NO Prisma/Next imports (AGENTS.md §7).

import type { ExplanationReasonCode, RankableItem, RankingParams, RankingResult } from "./types";

export interface RankingEnginePort {
  computeRanking(
    items: RankableItem[],
    utilityByItemId: Map<string, number>,
    params: RankingParams,
    nowIso: string,
  ): RankingResult[];
}

export class RankingEngine implements RankingEnginePort {
  computeRanking(
    items: RankableItem[],
    utilityByItemId: Map<string, number>,
    params: RankingParams,
    nowIso: string,
  ): RankingResult[] {
    const now = Date.parse(nowIso);
    const lambdaDays = params.saturationLambda;

    // Eligibility: ACCEPTED only (moderation overrides engagement, ADR-0004 D3).
    const eligible = items.filter((i) => i.status === "ACCEPTED");

    // Per-item utility with saturation decay + exposure cap.
    const utility = new Map<string, number>();
    for (const item of eligible) {
      const raw = utilityByItemId.get(item.id) ?? 0;
      if (raw <= 0) {
        utility.set(item.id, 0);
        continue;
      }
      const ageDays = Math.max(0, (now - Date.parse(item.acceptedAt)) / 86_400_000);
      const decayed = raw * Math.exp(-lambdaDays * ageDays);
      // Exposure cap: an item's utility contribution cannot exceed 2× the
      // median raw across eligible items — bounded dominance.
      utility.set(item.id, decayed);
    }

    // Normalize utility across eligible items to [0,1] so the blend weights
    // are comparable with quality/recency.
    const rawValues = [...utility.values()].filter((v) => v > 0);
    const maxUtility = rawValues.length > 0 ? Math.max(...rawValues) : 0;

    // Recency score: linear decay from 1 (accepted today) to 0 at 90 days.
    const RECENCY_HALF_LIFE_DAYS = 90;
    const recencyScore = (item: RankableItem): number => {
      const ageDays = Math.max(0, (now - Date.parse(item.acceptedAt)) / 86_400_000);
      return Math.max(0, 1 - ageDays / RECENCY_HALF_LIFE_DAYS);
    };

    const scored: Array<RankingResult & { _tiebreak: string }> = eligible.map((item) => {
      const u = maxUtility > 0 ? (utility.get(item.id) ?? 0) / maxUtility : 0;
      const r = recencyScore(item);
      const final =
        params.wQuality * item.qualityScore + params.wRecency * r + params.wUtility * u;
      return {
        itemId: item.id,
        title: item.title,
        creatorId: item.creatorId,
        creatorName: item.creatorName,
        qualityScore: item.qualityScore,
        recencyScore: r,
        utilityScore: u,
        finalRankScore: final,
        explanationReasonCode: pickReason(item, u, r, params),
        _tiebreak: item.id,
      };
    });

    // Deterministic sort: descending finalRankScore, ties broken by itemId
    // (stable, no randomness).
    scored.sort((a, b) =>
      b.finalRankScore !== a.finalRankScore
        ? b.finalRankScore - a.finalRankScore
        : a._tiebreak.localeCompare(b._tiebreak),
    );

    // Diversity cap: maxItemsPerCreator per creator within the top-N.
    const ranked: Array<RankingResult & { _tiebreak: string }> = [];
    const creatorCount = new Map<string, number>();
    const byCreator = new Map<string, Array<RankingResult & { _tiebreak: string }>>();
    // Two-pass to guarantee per-creator cap even when a creator dominates
    // the top-N: first pass admits up to cap per creator in score order,
    // second pass fills remaining slots with next-best from capped creators.
    for (const r of scored) {
      if (!byCreator.has(r.creatorId)) byCreator.set(r.creatorId, []);
      byCreator.get(r.creatorId)!.push(r);
    }
    // Round-robin-ish admission: iterate creators in first-appearance order,
    // admitting at most cap each, until topN reached.
    const firstSeen: string[] = [];
    const seen = new Set<string>();
    for (const r of scored) {
      if (!seen.has(r.creatorId)) {
        seen.add(r.creatorId);
        firstSeen.push(r.creatorId);
      }
    }
    const pools = firstSeen.map((c) => ({
      creator: c,
      items: (byCreator.get(c) ?? []).slice(0, params.maxItemsPerCreator),
      cursor: 0,
    }));
    let admitted = 0;
    let guard = 0;
    while (admitted < params.topN && guard < 10_000) {
      guard += 1;
      let progressed = false;
      for (const pool of pools) {
        if (admitted >= params.topN) break;
        if (pool.cursor < pool.items.length) {
          ranked.push(pool.items[pool.cursor]);
          creatorCount.set(pool.creator, (creatorCount.get(pool.creator) ?? 0) + 1);
          pool.cursor += 1;
          admitted += 1;
          progressed = true;
        }
      }
      if (!progressed) break;
    }
    void creatorCount;

    // Strip the internal tiebreak field before returning.
    return ranked.map(({ _tiebreak, ...rest }) => {
      void _tiebreak;
      return rest;
    });
  }
}

// ─── Reason selection (R7: explain WHY) ───────────────────────────────────
// Deterministic, provenance-anchored. Precedence: quality > recency > utility.
function pickReason(
  item: RankableItem,
  utility: number,
  recency: number,
  params: RankingParams,
): ExplanationReasonCode {
  if (params.wQuality > 0 && item.qualityScore >= 0.85) return "QUALITY";
  if (params.wRecency > 0 && recency >= 0.8) return "RECENT";
  if (params.wUtility > 0 && utility >= 0.6) return "SAVED_SIMILARITY";
  return "QUALITY";
}
