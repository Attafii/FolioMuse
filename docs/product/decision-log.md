# FolioMuse — Product Decision Log

This file is **append-only**. Never edit or delete a prior entry — if a decision is reversed, add a new entry that supersedes it and references the entry number it supersedes.

Format per entry:

```
## D-<number> — <short title>
Date: <date>
Status: Accepted | Superseded by D-<n>
Context: <why this decision was needed>
Decision: <what was decided>
Consequences: <what this enables/constrains going forward>
Related: <ADR-xxx, charter section, etc.>
```

---

## D-1 — Establish product charter as the canonical source of truth

Date: 2026
Status: Accepted
Context: FolioMuse is a greenfield repository (only `LICENSE` existed prior to this work). Section 01 · Product foundation requires a charter, personas, JTBD, non-goals, success metrics, content-quality principles, originality rules, and this decision log before any feature code is written.
Decision: Created `docs/product/charter.md` as the canonical, binding definition of product boundary, differentiated promise, and success criteria, with supporting documents (`personas.md`, `jobs-to-be-done.md`, `success-metrics.md`, `content-quality-principles.md`, `originality-rules.md`) and this decision log. Also created `AGENTS.md` at repo root to encode agent operating rules (skill gates, stack conventions, architectural boundaries, quality gates) referencing the charter.
Consequences: All future features (human gallery, section intelligence, MCP agent) must be checked against the non-goals (especially the anti-cloning rules, NG1/NG3/NG4) and the north-star metric before implementation. Any conflict must be raised, not silently overridden.
Related: `docs/product/charter.md`, `AGENTS.md`, `docs/product/originality-rules.md`

## D-2 — North-star metric defined as "weekly published portfolio rate" (original content only)

Date: 2026
Status: Accepted
Context: Needed a single north-star metric that captures value across all three pillars (gallery, section intelligence, MCP agent) without rewarding cloning behavior.
Decision: North-star metric is "published portfolios per active builder, per week," explicitly excluding/flagging near-duplicate publishes via the originality-score guardrail metric.
Consequences: Any feature that increases raw engagement (e.g., gallery page views) without contributing to original, published output is not credited toward the north-star. Analytics/telemetry work in future features must be able to compute the originality-score guardrail.
Related: `docs/product/success-metrics.md`

## D-3 — Skills environment gap noted

Date: 2026
Status: Accepted (tracked as open risk)
Context: The task required loading a "Taste Skill" before UI work and a "Ponytail Skill" after tests pass. At execution time, `read_skill` reported no skills installed in this environment.
Decision: Documented the gate requirement in `AGENTS.md` §3 regardless of current availability, and proceeded with this docs-only feature (which triggers neither gate, since it contains no UI code and no code to simplify). Skill availability must be re-checked before Section 02+ work that touches UI.
Consequences: Any future feature that touches UI must re-verify skill availability and block if the Taste Skill is still unavailable, per `AGENTS.md`.
Related: `AGENTS.md` §3

---

## D-4 — Editorial acceptance and curation rubric with tiered consent, L0–L4 quality levels, and mandatory compliance gate

Date: 2026
Status: Accepted
Context: Section 01 requires a repeatable editorial standard for what enters the gallery corpus. The curation rubric (`docs/product/curation-rubric.md`) and gallery schema (ADR-0002, `docs/adr/0002-gallery-schema-design.md`) define the standard and its persistence shape. This decision locks the rubric's multi-dimensional structure (Quality × Compliance), tiered consent model (`DISPLAY` / `PATTERN_DERIVE` / `FULL`), append-only audit log, and originality-score schema-readiness (fields reserved, algorithm deferred per R8).
Decision: (1) Accept the curation rubric as binding for any feature touching the gallery corpus. (2) Adopt a multi-dimensional rubric — quality L0–L4 scored independently from a mandatory compliance gate (`PASS` / `FLAG` / `FAIL`). An item with `compliance = FAIL` cannot be accepted regardless of quality score. (3) Adopt a tiered consent model with a `ConsentRecord` table: `DISPLAY` (gallery display only), `PATTERN_DERIVE` (derivation for pattern signals permitted), `FULL` (unrestricted within FolioMuse's anti-cloning guardrails). (4) Adopt an append-only `AuditEntry` model — no update or delete in the domain interface; audit integrity is enforced at the contract level. (5) Reserve `structureFingerprint` and `contentHash` fields on `GalleryItem` for future originality-score computation; the algorithm is deferred per R8's open questions.
Consequences: No item may be accepted into the gallery corpus without `compliance = PASS`, quality ≥ L2, a valid consent record, and complete attribution. Consent revocation triggers `ARCHIVED` status (never deletion); affected pattern signals are marked stale via `staleSince`. Emergency takedown allows any reviewer to set `SUSPENDED` immediately, with full review required within 48 hours. Reviewer conflicts (>1 level quality score difference) auto-escalate to a senior reviewer; the senior decision is binding and logged as `OVERRIDE`. Stale-content threshold is 18 months since last review, triggering `ARCHIVED`. Open questions deferred to future ADRs: originality-score algorithm and threshold, publish-time enforcement level (warn vs. block), and data-retention policy for gallery attribution records.
Related: `docs/product/curation-rubric.md`, `docs/adr/0002-gallery-schema-design.md`, `docs/product/originality-rules.md` (R1–R8), `docs/product/charter.md` (NG1, NG3, NG4)

## D-5 — Provenance and originality policy: PROV-O provenance, licence-consent intersection, immutable attribution, durable removal, and derivative rebuild with a strengthened R2 diversity floor

Date: 2026
Status: Accepted
Context: ADR-0001/0002 established the anti-cloning boundary and gallery schema but left provenance-specific questions open: how provenance is modelled, how licence and consent intersect, how creator identity is canonicalized, how AI contributions are disclosed without storing raw content, how ownership claims and removals are adjudicated, and how derivatives are invalidated and rebuilt after removal. Section 01 requires these to be binding before provenance persistence and service code are written.
Decision: (1) Adopt W3C PROV-O entity/activity/agent provenance shape via new `Creator`, `SourceRecord`, `AiProvenance`, `OwnershipClaim`, and `RemovalRecord` models plus `ConsentRecord.revokedAt`, rolled out additively with no backfill of guessed provenance (`UNKNOWN` disclosure where unknown). (2) Effective permission is the derived intersection of licence, consent tier, and policy — never a stored mutable permission field; ND licences are display-only for derivation regardless of consent, and NC items are display-only until commercial posture is decided. (3) Attribution is immutable (R3); corrections use superseding provenance assertions, never mutation; creator canonicalization is explicit only (no fuzzy auto-merge). (4) AI provenance is metadata-minimized: hashes plus provider/model/timestamp/disclosure, never raw prompts or outputs. (5) Ownership claims follow PENDING → UNDER_REVIEW → ACCEPTED|REJECTED (credible claims may SUSPEND immediately); removal is durable (`REQUESTED` → `EFFECTIVE` → `COMPLETED`), never a hard delete. (6) Derivative rebuild is async and idempotent: removal marks affected PatternSignals stale and queues rebuild; the R2 floor is strengthened to **≥3 eligible items AND ≥2 distinct creators** (diversity floor); signals below floor enter `DROPPED_BELOW_FLOOR` (not deleted). (7) Safe projection boundary: no public/API/MCP contract returns `contentBlob` + `structureJSON` together, exposes raw captures/prompts/claimant evidence, or exposes a full-item fetch tool.
Consequences: Every artifact is attributable, every permission is provable, and every AI contribution is disclosed. Removal satisfies legal/audit durability without enabling copying, and the ≥2-creator diversity floor closes a single-creator aggregation loophole. Constraints that follow: no automated creator merging, no hard deletes (row count grows monotonically), no derivation from ND/NC items, rebuild requires the floor (below-floor signals are dropped, not repaired by weakening R2), and the MCP read surface never returns full gallery content. Deferred: commercial-use posture for NC items, data-retention duration, originality-score algorithm/enforcement, crawler/API ingestion modes, verified creator identity (W3C VC). The binding policy is `docs/product/provenance-and-originality-policy.md`; architectural implementation is ADR-0003. Supersedes nothing; D-1–D-4 remain in force.
Related: `docs/product/provenance-and-originality-policy.md`, `docs/adr/0003-provenance-and-originality-policy.md`, `docs/adr/0002-gallery-schema-design.md`, `docs/product/originality-rules.md` (R2, R3, R5, R6), `docs/product/charter.md` (NG1, NG3, NG4)
