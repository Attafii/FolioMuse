# AGENTS.md — FolioMuse Operating Rules

This file governs how any AI agent (Atlas, Ponytail, or other automation) must plan, implement, and verify changes in this repository. It is the first file any agent must read before making changes.

## 1. Product identity (source of truth)

The canonical product definition lives in [`docs/product/charter.md`](./docs/product/charter.md). Every feature must be checked against:
- The charter's mission, non-goals, and originality rules
- `docs/product/personas.md` and `docs/product/jobs-to-be-done.md`
- `docs/product/success-metrics.md` (north-star + guardrail metrics)
- `docs/product/decision-log.md` (append, never rewrite history)

If a proposed feature conflicts with a non-goal (e.g. turns the gallery into a cloning tool), **stop and raise the conflict** instead of implementing it.

## 2. Required reading order before any edit

1. This file (`AGENTS.md`)
2. The approved plan / task description
3. Relevant ADRs in `docs/adr/`
4. Any `SKILL.md` required by the task (see §3)
5. Existing domain/service code touched by the change
6. Existing tests and fixtures for the touched area

## 3. Skill gates

- **Taste Skill** — MUST be loaded and followed before writing or editing any user-facing UI (components, pages, styles, layout, motion, copy in the UI). Do not write UI code without it.
- **Ponytail Skill** — MUST be used only *after* behavior, security, accessibility, and tests pass. Ponytail's job is to simplify or delete code (dead code, duplication, unnecessary abstraction) **without changing the accepted outcome**. Never use Ponytail to change behavior or skip tests.
- If a required skill is not installed/available in the environment, stop and flag it explicitly — do not silently proceed as if the skill were applied.

## 4. Stack conventions (target state)

- **Framework:** Next.js (App Router), TypeScript strict mode
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Neon (Postgres) via a domain-service layer — no direct DB calls from UI components
- **Validation:** Zod for all external inputs and all AI/provider outputs
- **AI/MCP:** MCP transport, provider, and domain logic must be separated into distinct layers (transport ≠ provider ≠ domain)

## 5. Architectural boundaries

Keep these concerns in separate layers, never mixed in one file/module:
- **UI** (components, pages) — no business logic, no direct DB/AI calls
- **Domain** (use-cases, business rules) — framework-agnostic where possible
- **Persistence** (Neon access, migrations) — behind a repository/service interface
- **AI/provider** (OpenAI, other model providers) — behind an adapter interface, outputs validated with Zod before use
- **MCP transport** (server, tool definitions) — thin layer calling into domain services, no business logic inline

## 6. Non-negotiable quality gates

Every change must, before being considered done:
- [ ] Pass typecheck
- [ ] Pass lint
- [ ] Pass unit tests
- [ ] Pass integration tests
- [ ] Pass E2E tests (when UI/flows are affected)
- [ ] Pass visual/contract tests (when UI or API contracts are affected)
- [ ] Preserve provenance/attribution for any human-gallery content
- [ ] Preserve authorization and privacy boundaries
- [ ] Meet accessibility requirements (keyboard, focus, reduced motion, high contrast)
- [ ] Meet performance budgets
- [ ] Include migrations + rollback plan for any schema change
- [ ] Include telemetry for new user-facing behavior

## 7. Responsive & accessibility verification (UI changes)

Verify at minimum: 1440px, 1024px, 768px, 390px viewports; full keyboard navigation; visible focus states; `prefers-reduced-motion`; high-contrast mode.

## 8. Originality & anti-cloning rule

FolioMuse's human gallery exists to **inspire**, never to enable 1:1 duplication of another creator's portfolio. Any feature touching the gallery, section intelligence, or MCP agent must:
- Preserve attribution/provenance metadata on gallery items
- Prevent bulk/verbatim export of another user's content structure + copy + assets as a single unit
- Ensure AI-generated suggestions are transformed/synthesized, not copied verbatim from a single source
- Be checked against `docs/product/charter.md` §"Originality rules" before merge

## 9. Scope discipline

- Do not edit files unrelated to the approved task.
- Do not add dependencies without documented justification in the PR/commit description.
- Do not rewrite or delete historical entries in `docs/product/decision-log.md` — append only.

## 10. Evidence requirement

No change is "done" without evidence: list of changed files, command output (typecheck/lint/test results), screenshots for UI, migration + rollback notes for schema changes, telemetry added, and remaining risks. Never claim success without evidence.

## 11. Framework version warning (from create-next-app scaffold)

<!-- BEGIN:nextjs-agent-rules -->
This version of Next.js has breaking changes — APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js-specific code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->