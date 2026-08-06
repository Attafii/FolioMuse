# ADR-0004: Data flywheel and ranking feedback — behavior-driven discovery with saturation, diversity, experiments, and explanation signals

Date: 2026
Status: Accepted

## Context

FolioMuse's three pillars (human gallery, section intelligence, MCP agent) currently rank nothing by behavior: gallery discovery order and section-intelligence suggestion strength are static. The product goal is to "use behavior to improve discovery without creating popularity lock-in" — i.e., learn from how builders interact with the gallery (what they open, save, add to collections, retrieve via the agent, dismiss, reformulate) and feed that signal back into *what gets surfaced*, while deliberately preventing the rich-get-richer dynamics that turn engagement into permanent dominance and, at the extreme, into a copying amplifier.

This is constrained by several already-binding decisions:

- `docs/product/success-metrics.md` explicitly lists **raw gallery page views / time-on-gallery as NON-metrics** ("vanity metric, could reward passive browsing/copying"). Engagement must therefore be weighted toward *action* (save, collection-add, MCP retrieval-to-use, reformulation, moderator acceptance), never raw impressions alone.
- Originality rules R2 (synthesis only from N ≥ 3 items across ≥ 2 creators), R3 (attribution travels), R5 (agent writes only user-authored or pattern-synthesized content), R6 (AI disclosure), R7 (users must see WHY a suggestion was made and reject without side effects) constrain what a ranking may amplify and how it must explain itself.
- ADR-0001 (no MCP full-content fetch), ADR-0002 (no `contentBlob` + `structureJSON` exposure; append-only audit; status lifecycle), ADR-0003 (safe projection boundary, privacy-minimized telemetry §12, durable removal, ≥2-creator diversity floor) constrain what behavior data may be stored, how it may be aggregated, and what any ranking/suggestion output may contain.
- AGENTS.md §7 keeps UI, domain, persistence, AI/provider, and MCP transport in separate layers. There is currently no UI, no `src/mcp`, no API routes — only domain + persistence + verifier scripts.

This ADR records the architectural decisions for the behavior flywheel: event vocabulary and privacy, saturation/decay, diversity rules, minimal deterministic experiments, and explanation signals. The implementation is additive: new `src/domain/flywheel` module, new persistence models, a verifier script — no changes to curation/provenance behavior.

## Decision

### Decision 1: Behavior is captured as privacy-minimized, append-only events

A single `BehaviorEvent` model records discrete user actions with the following shape:

- **Subject key**: the acting builder is identified only by a SHA-256 hash (64 lowercase hex chars) of a stable anonymous id — never a raw identifier, email, or IP.
- **Target**: either an `itemId` (gallery item) and/or a `patternSignalId` (section-intelligence pattern), plus optional `experimentId` + `variant` attribution.
- **Payload**: Zod-validated record of primitive values only — no nested objects, no content, no URLs, no prompts, no raw captures (ADR-0001/0002/0003 safe-projection boundary). The payload is structural metadata (e.g., `{sectionType: "EDITORIAL_HERO"}`), never expressive content.
- **Idempotency**: a unique `idempotencyKey` guarantees a retried ingestion does not double-count (mirrors provenance rebuild idempotency, ADR-0003 D8).
- **Durability**: events are append-only (no update/delete path in the domain port), consistent with the append-only audit rule (ADR-0002 D4).

Event vocabulary (this feature): `IMPRESSION`, `OPEN`, `SAVE`, `COLLECTION_ADD`, `MCP_RETRIEVAL_USE`, `DISMISSAL`, `REFORMULATION`, `MODERATOR_ACCEPTANCE`. The vocabulary is stored as strings and validated by Zod (evolving-vocabulary decision, same as curation/provenance enums).

### Decision 2: Action-weighted utility, impressions de-emphasized

The success-metrics non-metric rule forbids raw views from driving discovery. Therefore each event type carries a **weight** that converts raw counts into a utility contribution:

- `IMPRESSION = 1` (exposure only — deliberately lowest)
- `OPEN = 2`
- `SAVE = 3`
- `COLLECTION_ADD = 4`
- `MCP_RETRIEVAL_USE = 5` (retrieval-to-use is a strong intent signal for pattern suggestions)
- `DISMISSAL = -3` (negative — dampens)
- `REFORMULATION = 5` (the builder applied a suggestion to their own portfolio — the flywheel's true north, aligned with the published-portfolio north-star)
- `MODERATOR_ACCEPTANCE = 6` (editorial confirmation of quality/compliance — highest trust signal)

Weights are **domain constants**, exported and documented, not stored in the database. They are deliberately chosen so that aggregate *action* dominates aggregate *impression*; a popular-but-unused item cannot outrank a frequently-saved, occasionally-reformulated one on raw view counts alone.

### Decision 3: Saturation penalties — decay, not dominance

Ranking must not create permanent popularity lock-in. Two mechanisms:

1. **Time decay**: utility is decayed by age — `decayed = rawUtility × exp(-λ × ageDays)` with a configurable `λ` (default chosen so an item's half-life is on the order of weeks). Older engagement contributes less than recent engagement; an item that stops earning action naturally sinks.
2. **Saturation cap**: a single item's utility contribution to the *ranking blend* is capped (configurable `maxUtilityContribution`). Beyond the cap, additional engagement no longer increases the item's rank — this directly prevents a single runaway item from occupying the top of discovery forever.

Decay is a pure function of (raw aggregate, item age, λ, clock) — deterministic and testable with an injected clock (mirrors `ProvenanceClock`).

### Decision 4: Diversity rules — creator and pattern diversity are hard caps

Ranking output and suggestion strength must preserve diversity, consistent with the R2/ADR-0003 diversity floor (≥ 2 distinct creators for pattern synthesis):

- **Creator cap**: a ranked feed may surface at most `maxItemsPerCreator` items per creator in the top window (default 2 in top 20). The ranking engine enforces this as a post-blend filter, so no single creator can dominate discovery regardless of engagement.
- **Eligibility gate**: only `status = ACCEPTED` gallery items rank. `REJECTED`, `SUSPENDED`, `PENDING_REVIEW`, `ARCHIVED` items never appear in ranked output regardless of engagement — moderation/quality gates always override behavior signals.
- **Suggestion floor (R2)**: a PatternSignal contributes to suggestion strength only if `eligibleItemCount ≥ 3` AND `distinctCreatorCount ≥ 2` (the ADR-0003 strengthened floor). Signals below the floor contribute zero, mirroring `DROPPED_BELOW_FLOOR` behavior — the flywheel never weakens R2 to surface a popular-but-unsafe pattern.
- **Suggestion diversity**: uplift from behavior is bounded per signal (saturation cap), so one popular pattern cannot crowd out the rest of the suggestion set.

### Decision 5: Experiments are minimal, deterministic A/B

Experiments are a lightweight mechanism to safely test ranking/suggestion parameter changes:

- `Experiment` registry with `DRAFT` / `RUNNING` / `PAUSED` / `COMPLETED` status; variants declared as `{key, weight}` pairs whose weights sum to 1; a `guardrailConfig` declaring acceptable thresholds for originality-score deviation, diversity index, and attribution violations.
- **Assignment is deterministic**: variant = hash(`${experimentId}:${subjectKey}`) modulo cumulative weight via `node:crypto` SHA-256 — no `Math.random`. The same subject always gets the same variant (idempotent assignment, `@@unique([experimentId, subjectKey])`).
- **Guardrail evaluation**: `evaluateGuardrails(experimentId)` compares live metrics against thresholds and returns a `PAUSED` recommendation on breach. The domain service **returns the recommendation** — it does not auto-disable (the caller decides), keeping the domain layer side-effect-free and testable.
- No statistics engine, no significance testing in this feature — the guardrails are the safety net.

### Decision 6: Explanation signals are provenance-anchored reason codes

Per R7, builders must be able to see *why* an item or suggestion was surfaced. Every ranked result and adjusted suggestion carries an `explanationReasonCode` from a fixed union:

- `QUALITY` (moderator-approved quality level), `RECENT` (recency), `DIVERSITY` (surfaced to maintain creator diversity), `SAVED_SIMILARITY` (similarity to saved/collected items), `PATTERN_FREQUENCY` (aggregated from N ≥ 3 eligible items — R2), `EXPERIMENT_ARM` (strength modified by an experiment variant), `MODERATOR_APPROVED` (accepted by a moderator).

Reason codes are metadata only — they never contain source URLs, creator names, or content (ADR-0003 D9 safe projection). They are the atomic unit of R7 transparency and, in a later feature, the feed UI can render them verbatim.

### Decision 7: The flywheel never reads or emits content

The entire module operates on **metadata records only**: item ids, status, quality levels, style tags, creator ids, pattern eligibility counts. No `contentBlob`, no `structureJSON`, no source captures, no prompts, no URLs-of-sources cross any flywheel boundary (input, output, telemetry, or persistence). This is a direct application of ADR-0001 (no full-content fetch), ADR-0002 D7 (no exportable content blob), and ADR-0003 D9 (safe projection). The ranking output is a safe projection: ids + scores + reason codes.

### Decision 8: Telemetry is privacy-minimized and never throws

`FlywheelTelemetry.emit(event)` mirrors the provenance telemetry port (ADR-0003 §12): structured events carrying only ids, enums, and counts — never subject keys in raw form, never payloads, never content. The port is `void` (never throws; a broken telemetry sink must not break the flywheel). A contract test asserts every emitted event's keys belong to an allowlist.

## Consequences

### What this enables

- **Behavior-driven discovery without lock-in**: ranking learns from action-weighted, decayed, diversity-capped signals; no single item or creator can dominate indefinitely.
- **Safe experiments**: deterministic A/B with guardrail auto-pause recommendations lets ranking parameters be tuned without gambling on originality/diversity guardrails.
- **Transparent suggestions**: every surfaced item/suggestion carries a human-readable reason code (R7 readiness), and the flywheel's metadata-only discipline means nothing it produces can be chained into a verbatim copy.
- **Additive integration**: no changes to curation/provenance behavior; the flywheel reads their records and ports and adds a new module + models + verifier.

### What this constrains

- **No raw-view-based ranking**: impressions are the weakest signal; raw page views never drive discovery (success-metrics non-metric).
- **No engagement overrides moderation**: only ACCEPTED items rank; REJECTED/SUSPENDED items never surface regardless of popularity.
- **No weakening of R2**: suggestion strength respects the ≥3-items/≥2-creators floor; the flywheel cannot surface below-floor signals.
- **No content in the flywheel**: metadata-only discipline is enforced by schema, port, and contract-test levels.
- **No non-determinism**: ranking and experiment assignment are pure functions (tested determinism); the only time source is an injectable clock.
- **No UI/MCP/API in this feature**: the flywheel is foundation contracts only; consuming surfaces (feed UI, MCP tools, API routes) are future features per AGENTS.md §7.

### Open questions (explicitly deferred)

1. **λ and cap calibration**: exact decay half-life and saturation cap values are configurable defaults; production calibration via the experiment mechanism is future work.
2. **Weight tuning**: event weights are documented constants; tuning belongs to experiments (Decision 5), not this ADR.
3. **Retention of behavior events**: retention/deletion policy for `BehaviorEvent` rows is deferred (consistent with ADR-0003 open question 2 on retention).
4. **Surface integration**: how a future feed UI / MCP tool consumes `RankingResult` and renders reason codes is a later feature.
5. **Cross-device subject identity**: the subject key assumes a stable anonymous id per builder; identity unification is out of scope.

## Alternatives considered

### Alternative: Rank by raw popularity (rejected)

Sort discovery by raw view/save counts with no decay or cap.

Rejected because it is exactly the "popularity lock-in" the feature brief forbids, and it would reward passive browsing — directly contradicting the success-metrics non-metric ("raw gallery page views ... could reward passive browsing/copying"). Popularity would also tend to amplify already-dominant single items, creating a copying risk surface.

### Alternative: Store resolved scores in the database on every event (rejected)

Materialize per-item ranking scores on each ingestion.

Rejected because it couples ingestion latency to ranking recomputation, makes ranking statefulness harder to reason about, and invites drift. Instead the flywheel computes scores on demand from append-only events (deterministic pure functions) and persists only when a caller asks to (verifier/integration path) — keep domain logic pure and testable.

### Alternative: Full experiment framework with significance testing (rejected)

Ship bucketing + metric aggregation + statistical significance checks.

Rejected as overkill for this stage (per the interview decision): the guardrail-based deterministic A/B covers the need to safely change parameters without gambling guardrails, and a statistics engine can be layered on later without changing the assignment contract.

### Alternative: Random assignment for experiments (rejected)

Assign variants via `Math.random()`.

Rejected because non-deterministic assignment breaks testability, idempotency, and reproducibility of reported results. Deterministic hashing of (experiment, subjectKey) gives stable, auditable assignments for free.

### Alternative: Suggestion uplift unbounded (rejected)

Let behavior signals arbitrarily inflate a pattern's suggestion strength.

Rejected because it would let a single popular pattern dominate suggestions, starving diversity and re-creating lock-in at the suggestion layer. Bounded uplift plus the R2 floor keeps suggestions representative.

## Related

- `docs/product/success-metrics.md` — non-metric rule (raw views) motivating Decision 2 weights and Decision 3 decay.
- `docs/product/originality-rules.md` — R2 (diversity floor), R5 (agent writes only user content), R7 (explanation signals) operationalized by Decisions 4 and 6.
- `docs/adr/0001-product-charter-and-anti-cloning-boundary.md` — no full-content fetch; reinforced by Decision 7.
- `docs/adr/0002-gallery-schema-design.md` — append-only audit (D4), no exportable content blob (D7); extended by Decisions 1 and 7.
- `docs/adr/0003-provenance-and-originality-policy.md` — safe projection (D9), privacy-minimized telemetry (§12), diversity floor (D8); extended by Decisions 1, 4, 6, 8.
- `docs/product/decision-log.md` — D-6 records the product-level decisions (append-only).
- `docs/product/curation-rubric.md` + `docs/product/reviewer-runbook.md` — moderator acceptance source of `MODERATOR_ACCEPTANCE` events.
