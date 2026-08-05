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
