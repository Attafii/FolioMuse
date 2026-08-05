# AGENTS.md — FolioMuse Operating Rules

Read this before any change. It captures high-signal, repo-specific facts an agent would otherwise guess wrong.

## 1. Product identity (source of truth)

Canonical product definition lives in [`docs/product/charter.md`](./docs/product/charter.md). Every feature must be checked against:
- `docs/product/charter.md` — mission, non-goals, originality rules
- `docs/product/personas.md`, `docs/product/jobs-to-be-done.md`, `docs/product/success-metrics.md`
- `docs/product/originality-rules.md` (R1–R5) and `docs/product/content-quality-principles.md`
- `docs/product/decision-log.md` — **append only, never rewrite history**
- `docs/adr/` (currently ADR-0001: charter + anti-cloning boundary)

If a feature conflicts with a non-goal (e.g. turns the gallery into a cloning tool), **stop and raise the conflict** instead of implementing.

## 2. Required reading order before any edit

1. This file
2. The approved plan / task description
3. Relevant ADRs in `docs/adr/`
4. Any `SKILL.md` required by the task (see §3)
5. Existing code/tests touched by the change

## 3. Skill gates

- **Taste Skill** — MUST be loaded before writing or editing any user-facing UI (components, pages, styles, layout, motion, copy). Do not write UI code without it.
- **Ponytail Skill** — use ONLY after behavior, security, accessibility, and tests pass. It simplifies/deletes code without changing the accepted outcome. Never use it to change behavior or skip tests.
- **Prisma skills** are vendored into `.claude/skills/` and `.agents/skills/` via `skills-lock.json` (source: `prisma/skills` on GitHub). Load the matching one (`prisma-cli`, `prisma-client-api`, `prisma-upgrade-v7`, etc.) before any Prisma work — v7 has breaking changes vs v6.
- If a required skill is not installed/available, stop and flag it explicitly — do not silently proceed.

## 4. Developer commands

Only these npm scripts exist (`package.json`):

```bash
npm run dev      # next dev (Turbopack, roots at repo dir via next.config.ts)
npm run build    # next build
npm run start    # next start (production)
npm run lint     # eslint (flat config: next core-web-vitals + TS)
npm test         # vitest run (unit + integration tests)
npm run test:watch  # vitest in watch mode
```

**There is NO `typecheck` or `prisma:*` npm script.** Run these manually:

```bash
npx tsc --noEmit                       # typecheck (tsconfig is strict, noEmit, paths @/* -> ./src/*)
npx prisma generate                    # regenerate client after schema.prisma changes
npx prisma migrate dev --name <name>   # create a migration (migrations dir: prisma/migrations)
npx prisma validate                    # validate schema
```

Required command order for a change: **lint → typecheck → build**. There is no test runner configured yet — if you add one, also add the npm script and update this section.

## 5. Toolchain quirks (high-signal)

- **Framework:** Next.js 16.2.12 (App Router) + React 19.2. The `<!-- BEGIN:nextjs-agent-rules -->` block below applies. Read `node_modules/next/dist/docs/` before writing Next-specific code; APIs differ from training data.
- **TypeScript:** strict mode, `target: ES2017`, `moduleResolution: bundler`, path alias `@/*` → `./src/*`. Never suppress with `as any` / `@ts-ignore`.
- **Styling:** Tailwind CSS **v4**, CSS-first — there is **no `tailwind.config.*`**. Theme is declared via `@theme inline` in `src/app/globals.css` (imports `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`). PostCSS uses `@tailwindcss/postcss`.
- **shadcn/ui:** `components.json` uses style `base-nova`, baseColor `neutral`, cssVariables enabled, icon library `lucide`. Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`. Only `button.tsx` is installed so far — add new blocks with `npx shadcn@latest add <block>`.
- **Prisma 7 (v7, not v6):** `prisma.config.ts` loads `dotenv/config` and reads `process.env.DATABASE_URL` — a `.env` file with `DATABASE_URL` is required before any prisma command. Generator is `prisma-client` with `output = ../src/generated/prisma`. The generated client is **gitignored** — run `npx prisma generate` on fresh checkout and after every schema change. Import the client from `@/generated/prisma`, not `@prisma/client`.
- **Provider:** `postgresql` (Neon target per charter). No SQLite fallback in schema.
- **Validation:** Zod 4 for all external inputs and all AI/provider outputs.
- **`next.config.ts`** sets `turbopack.root` to the repo dir — keep that or dev server can break on Windows paths.

## 6. Current repo state (scaffold stage)

`src/` is essentially create-next-app output. Boundaries in §7 are **target/aspirational**, not yet implemented:
- `src/app/` — `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` (default scaffold; metadata still reads "Create Next App")
- `src/components/ui/` — shadcn primitives (only `button.tsx`)
- `src/lib/utils.ts` — shadcn `cn()` helper
- No `src/domain/`, `src/services/`, `src/server/`, `src/mcp/`, `src/hooks/`, or tests exist yet. When introducing them, follow §7 boundaries from the start rather than retrofitting later.

## 7. Architectural boundaries (target state)

Keep these concerns in separate layers, never mixed in one file/module:
- **UI** (`src/components`, `src/app`) — no business logic, no direct DB/AI calls
- **Domain** (use-cases, business rules) — framework-agnostic where possible
- **Persistence** (Neon access, migrations) — behind a repository/service interface; UI never imports Prisma directly
- **AI/provider** (OpenAI, other model providers) — behind an adapter interface; outputs validated with Zod before use
- **MCP transport** (server, tool definitions) — thin layer calling into domain services, no business logic inline

## 8. Non-negotiable quality gates

Before a change is "done":
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes (no npm script for this — run manually)
- [ ] `npm run build` passes
- [ ] Unit / integration / E2E tests pass **if they exist** (none configured yet)
- [ ] Visual/contract checks pass when UI or API contracts are affected
- [ ] Attribution/provenance preserved on any human-gallery content
- [ ] Authorization and privacy boundaries preserved
- [ ] Accessibility: keyboard, focus, `prefers-reduced-motion`, high-contrast
- [ ] Performance budgets met
- [ ] Migrations + rollback plan for any schema change
- [ ] Telemetry added for new user-facing behavior

## 9. Responsive & accessibility verification (UI changes)

Verify at minimum: 1440px, 1024px, 768px, 390px viewports; full keyboard navigation; visible focus states; `prefers-reduced-motion`; high-contrast mode.

## 10. Originality & anti-cloning rule

The gallery exists to **inspire**, never to enable 1:1 duplication. Any feature touching the gallery, section intelligence, or MCP agent must (per ADR-0001 + `originality-rules.md`):
- Preserve attribution/provenance metadata through any retrieval/embedding pipeline (R3)
- Derive section-intelligence suggestions from **aggregated patterns across N ≥ 3 gallery items** (R2), never a single source verbatim
- Ensure the MCP agent only writes user-authored or pattern-synthesized content (R5) — no code path copies gallery fields directly into a user's portfolio
- Not expose an MCP "fetch full gallery item content" tool that a client could chain into a verbatim copy
- Be checked against `docs/product/charter.md` §"Originality rules" before merge

## 11. Scope discipline

- Do not edit files unrelated to the approved task.
- Do not add dependencies without documented justification in the PR/commit message.
- Do not rewrite or delete `docs/product/decision-log.md` entries — append only.
- Do not commit `src/generated/prisma` or `.env*` (both gitignored).

## 12. Evidence requirement

No change is done without evidence: changed files list, command output (lint / `tsc --noEmit` / build), screenshots for UI, migration + rollback notes for schema changes, telemetry added, remaining risks. Never claim success without evidence.

## 13. Framework version warning (from create-next-app scaffold)

<!-- BEGIN:nextjs-agent-rules -->
Next.js 16 has breaking changes — APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js-specific code. Heed deprecation notices. React 19 is in use (`react@19.2`).
<!-- END:nextjs-agent-rules -->