# FolioMuse — North-Star Metric & Success Metrics

Parent document: `docs/product/charter.md`

## North-star metric

**Published portfolios per active builder, per week ("weekly published portfolio rate")** — narrowly: the count of users who reach a completed, publishable state on their own portfolio using original content, having engaged with at least one of the three pillars (gallery, section intelligence, or MCP agent).

**Why this metric:** It captures the whole value chain (inspiration → feedback → assisted editing → shipped outcome) in a single outcome-oriented number, and it is inherently resistant to being gamed by cloning (a cloned/duplicated portfolio should not count — see guardrails below).

## Supporting metrics

| Metric | Definition | Pillar |
|---|---|---|
| Gallery-to-edit conversion | % of gallery sessions followed by an edit to the user's own portfolio within 24h | Human gallery |
| Section-intelligence action rate | % of section-intelligence suggestions that lead to a content change in that section | Section intelligence |
| Agent task completion rate | % of MCP agent-initiated edit requests that complete successfully and are accepted by the user | MCP agent |
| Time-to-first-publish | Median time from account creation to first published portfolio | Overall funnel |
| Return-edit rate | % of published users who return to make further edits within 30 days | Retention/health |

## Guardrail metrics (must not be gamed)

| Guardrail | Definition | Why it matters |
|---|---|---|
| Originality score | Automated similarity check between a published portfolio's structure+copy and any single gallery item; flags above a similarity threshold | Directly enforces NG1/NG4 — the north-star metric must exclude/flag near-duplicate publishes |
| Attribution integrity | % of gallery items with intact, verifiable attribution/provenance metadata at time of display | Enforces NG3 |
| Agent-authored-content disclosure rate | % of MCP agent edits that are clearly attributable to agent action in the edit/version history | Supports transparency, trust, and future audit needs |
| Accessibility compliance rate | % of published portfolios passing baseline automated a11y checks | Product quality floor, independent of AI involvement |

## Metric ownership & review cadence

- North-star and guardrail metrics are reviewed whenever a feature in the gallery, section-intelligence, or MCP pillars ships (per `docs/product/decision-log.md`).
- Any proposed change to the north-star metric itself requires a decision-log entry and, if it changes what counts as "success," an ADR.

## Explicit non-metrics (things we deliberately do not optimize for in v1)

- Raw gallery page views / time-on-gallery (vanity metric, could reward passive browsing/copying over shipping original work).
- Number of AI-generated words produced (rewards verbosity, not quality or originality).
