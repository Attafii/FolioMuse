# ADR-0001: Product charter as source of truth; anti-cloning boundary across gallery, section intelligence, and MCP agent

Date: 2026
Status: Accepted

## Context

FolioMuse is a greenfield project. Before any feature code is written, we need an agreed product boundary connecting three planned pillars — human gallery, section intelligence, and an MCP agent experience — while explicitly preventing the product from becoming a portfolio-cloning tool. Without an early architectural commitment, future implementations risk taking shortcuts (e.g., an MCP tool that directly copies a gallery item's fields into a user's portfolio) that would violate the product's differentiated promise.

## Decision

1. `docs/product/charter.md` is the canonical, binding product definition. `AGENTS.md` requires every feature to be checked against it before implementation.
2. The three pillars are connected through a **shared pattern layer**, not direct content pass-through:
   - The human gallery stores attributed source items.
   - Section intelligence must derive suggestions from **aggregated patterns** across multiple gallery items (see `docs/product/originality-rules.md` R2), never from a single item verbatim.
   - The MCP agent may only write user-authored or pattern-synthesized content (R5) — it has no code path that copies gallery item fields directly into a user's portfolio record.
3. Attribution/provenance metadata is treated as a required field that must travel with gallery content through any retrieval/embedding pipeline (R3), not optional metadata that can be dropped by a future optimization.
4. An "originality score" guardrail signal must be computable at publish time (open question: enforcement level — logged in v1, decided by future ADR).

## Consequences

- Any future data model for the human gallery must separate "source item" (with attribution) from "pattern/derived signal" (aggregated, anonymized) as distinct persisted concepts — this is a schema-shaping constraint for the eventual Neon schema design, to be detailed in the ADR that introduces the gallery schema.
- The MCP tool surface must not expose a "fetch full gallery item content" tool that a client could chain into a direct copy; any gallery-read MCP tool must return pattern-level or attribution-display data, not a raw exportable content blob.
- Section-intelligence implementation must design its retrieval step (e.g., embeddings/RAG) to enforce a minimum source count (N ≥ 3, per originality-rules.md R2) before generating a suggestion, and must have a defined fallback when fewer sources are available.
- This ADR does not decide the specific similarity algorithm/threshold for the originality-score guardrail — that is an open question deferred to a future ADR once the gallery/embedding design exists.

## Alternatives considered

- **Direct pass-through (rejected):** Let section intelligence and the MCP agent read gallery items directly and let AI "rephrase" them per-request. Rejected because rephrasing a single source is still effectively cloning and fails originality-rules.md R2, and it creates a legal/consent risk tied to NG3.
- **No connection between pillars (rejected):** Keep gallery, section intelligence, and MCP agent fully independent. Rejected because it fails the differentiated promise in the charter ("see what works... get help making your version") and reduces product coherence.

## Related

- `docs/product/charter.md`
- `docs/product/originality-rules.md`
- `docs/product/success-metrics.md` (originality-score guardrail)
- `AGENTS.md` §5 (architectural boundaries), §8 (originality & anti-cloning rule)
