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
