# FolioMuse — Product Charter

Status: Draft v1 (Section 01 · Product foundation)
Owner: Ahmed Attafi
Last updated: 2026

> This is the canonical definition of what FolioMuse is, who it serves, and what it will never become. Every feature (`docs/product/decision-log.md` entries, ADRs, PRs) must be checked against this document. If a feature conflicts with a non-goal below, the feature must be rejected or the charter must be amended explicitly — never silently overridden.

## 1. Mission

FolioMuse helps individual creators and professionals build a portfolio that is genuinely their own — informed by real examples, sharpened by AI feedback on structure and content, and assembled with the help of an AI agent — without ever becoming a tool for copying someone else's work.

## 2. Product boundary (what FolioMuse is)

FolioMuse is a **portfolio-building product** composed of three connected pillars:

1. **Human gallery** — a curated collection of real, attributed portfolio examples that a user can browse for inspiration (layout patterns, content structure, tone).
2. **Section intelligence** — AI analysis and suggestions scoped to individual portfolio sections (hero, projects, case studies, about, contact) — evaluating clarity, structure, and completeness, not rewriting someone else's content into the user's site.
3. **MCP agent experience** — an MCP server/agent that lets AI tools assist a user in building, editing, and refining their own portfolio programmatically, using the user's own content and the section-intelligence signals.

These three pillars are connected: the gallery informs section intelligence's sense of "good structure," and the MCP agent uses section intelligence to assist the user — but the gallery is never a direct source of copyable output.

## 3. What FolioMuse is not (product boundary — see also `non-goals` below)

- Not a portfolio **cloning** service. Inspiration in, original output out — always.
- Not a general-purpose website builder (no e-commerce, no blog-first CMS, no SaaS landing-page product).
- Not a stock-asset or template marketplace.
- Not a scraper of third-party sites into the gallery without consent/licensing.

## 4. Differentiated promise

Where generic AI writing/design tools produce generic output, and portfolio templates produce identical-looking sites, FolioMuse's promise is:

> "See what works, understand why it works, and get help making *your* version — not a copy."

The differentiation is the **section-level intelligence** (feedback scoped to a specific part of a portfolio, grounded in real examples) combined with an **agent experience** that assists rather than replaces the user's own content and voice.

## 5. Target personas

See `docs/product/personas.md` for full detail. Summary:

- **P1 — The Builder (primary):** an individual professional (designer, developer, writer, etc.) actively building or refreshing their personal portfolio, with real work to showcase but uncertainty about structure/presentation.
- **P2 — The Explorer:** someone earlier in their career or field, browsing the human gallery for inspiration before they have much of their own content yet.
- **P3 — The Agent Operator:** a user (or their AI assistant, via MCP) who prefers to build/edit their portfolio through conversational/programmatic tooling rather than direct UI manipulation.

## 6. Jobs-to-be-done

See `docs/product/jobs-to-be-done.md` for full detail. Top-level jobs:

- Help me see how strong portfolios are structured, without copying one.
- Tell me what's weak or missing in a specific section of my own portfolio.
- Let me (or my AI assistant) make the edit directly, without me hand-writing everything in a UI.

## 7. Non-goals

- **NG1:** FolioMuse will not allow bulk or verbatim export/import of another user's full portfolio structure + copy + assets as a single unit (anti-cloning).
- **NG2:** FolioMuse will not position itself as a general website/CMS builder beyond the portfolio use case.
- **NG3:** FolioMuse will not ingest third-party portfolio content into the human gallery without explicit consent/licensing and attribution.
- **NG4:** FolioMuse will not let AI-generated section suggestions be verbatim copies of a single gallery example; suggestions must be synthesized/transformed from patterns, not sourced from one item.
- **NG5 (deferred, not decided):** Team/agency multi-seat features are out of scope for v1 unless a future ADR explicitly brings them in scope.

## 8. Success metrics

See `docs/product/success-metrics.md` for full detail, including north-star metric, supporting metrics, and guardrail metrics.

## 9. Content-quality principles

See `docs/product/content-quality-principles.md`.

## 10. Originality rules

See `docs/product/originality-rules.md`. These rules are **binding** on any feature touching the gallery, section intelligence, or MCP agent.

## 11. Decision log

All material product decisions (scope changes, non-goal amendments, metric changes) are appended to `docs/product/decision-log.md`. Never edit history — append new entries.

## 12. Amendment process

Any change to this charter (mission, boundary, non-goals) requires:
1. A new entry in `docs/product/decision-log.md` explaining the change and rationale.
2. An ADR in `docs/adr/` if the change has architectural consequences.
3. Explicit version bump of this file's "Status" line.
