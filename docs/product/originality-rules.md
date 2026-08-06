# FolioMuse — Originality Rules (Anti-Cloning)

Parent document: `docs/product/charter.md`
Operational companion: `docs/product/provenance-and-originality-policy.md` (binding provenance requirements: consent, licence compatibility, attribution immutability, AI disclosure, removal/rebuild rules)

These rules are **binding** on any feature touching the human gallery, section intelligence, or MCP agent experience. A feature or PR that violates any rule below must be rejected or amended before merge, and any exception requires a decision-log entry plus ADR.

## R1 — No verbatim structural cloning

No feature may allow a user (directly or via the MCP agent) to duplicate another gallery item's full structure + copy + asset set as a single action that produces a near-identical portfolio. "Near-identical" is defined operationally by the originality-score guardrail metric (see `success-metrics.md`).

## R2 — Synthesis, not sourcing, for AI suggestions

Section-intelligence suggestions must be generated from patterns aggregated across multiple gallery examples (minimum N ≥ 3, to be finalized in an ADR when the retrieval mechanism is designed), never from a single retrieved item's exact content. If only one relevant example exists, the system must fall back to general structural principles rather than paraphrasing that one item.

## R3 — Attribution travels with content

Any time gallery content is displayed, referenced in feedback, or used to ground an AI suggestion, its attribution/provenance metadata must be retrievable and displayed where the content itself is shown. Attribution must never be stripped during processing pipelines (e.g. embeddings/retrieval must retain a pointer back to source + attribution).

## R4 — Consent-gated ingestion

No third-party portfolio content enters the human gallery without an explicit consent/licensing record. Scraping without consent is prohibited (NG3). This record must be auditable (who consented, when, under what terms).

## R5 — Agent writes only user-owned content

The MCP agent may only write content that is either (a) authored/dictated by the user in the current session, or (b) synthesized guidance derived per R2. It must never copy gallery item content directly into a user's portfolio fields.

## R6 — Disclosure of AI/agent authorship

Any content inserted or modified by the MCP agent or by an "apply suggestion" action must be marked as such in the portfolio's edit/version history, distinguishable from manually-typed user content.

## R7 — Right to inspect and reject

Users must always be able to see *why* a suggestion was made (which patterns/principles it's grounded in, in general terms) and reject it without side effects. Suggestions must never auto-apply without explicit user action, unless the user has explicitly configured an auto-accept policy.

## R8 — Similarity monitoring at publish time

Before or at publish time, a published portfolio should be checked against the originality-score guardrail (see `success-metrics.md`). This charter does not mandate blocking publish on high similarity for v1, but does mandate that the signal be computed and logged so a future ADR can decide on enforcement (warn vs. block).

## Open questions (to be resolved via ADR before implementation)

- Exact algorithm/threshold for the originality-score similarity check.
- Whether high-similarity publishes are blocked, warned, or just logged in v1.
- Data retention policy for gallery source attribution records.
