# ADR-0005: Design token architecture and theming strategy

Date: 2026
Status: Accepted

## Context

Section 02 (Experience design) requires a shared visual language across every
public and authenticated interface. The stack is fixed by AGENTS.md §5:
Tailwind CSS v4 is CSS-first (no `tailwind.config.*`), the theme is declared
via `@theme inline` in `src/app/globals.css`, and the only UI primitives
installed are shadcn/ui `base-nova` blocks driven by CSS variables. No runtime
token engine or third-party theming dependency exists. FolioMuse needs one
system that survives both light and dark modes, respects reduced-motion, and
keeps a single accent family so the product reads as one voice.

The product direction (charter §5/§7) is an editorial technical-index: warm
neutral foundations, a single cobalt accent, semantic status states,
display/sans/mono typography roles, a 12/6/4 responsive grid, restrained
radius, and purposeful motion.

## Decision

### Decision 1: Primitive + semantic token layers in Tailwind v4 CSS-first

Tokens live in `src/app/globals.css` as CSS custom properties in two layers:

- **Primitives**: `--color-paper-*`, `--color-ink-*`, `--color-cobalt-*` in
  `oklch()`. These are the only raw hue sources in the system.
- **Semantics**: shadcn-compatible role tokens (`--background`, `--foreground`,
  `--primary`, `--muted`, `--border`, `--ring`, and so on) plus status tokens
  (`--success`, `--warning`, `--info`), defined once per mode.

`@theme inline` maps semantic variables onto Tailwind utilities (for example
`bg-primary` resolves to `var(--primary)`), so components reference roles, not
raw hues. There is no runtime token engine and no `tailwind.config.*`.

### Decision 2: Class-based theming with system default and FOUC-safe toggle

- Light is the default; dark is applied by a `.dark` class on `<html>`
  (Tailwind v4 `@custom-variant dark`).
- The default theme follows `prefers-color-scheme` when the user has not
  chosen explicitly (a "system" state).
- The user can toggle light/dark; the choice persists to `localStorage`
  (`foliomuse-theme`) and is applied by a tiny inline script in the root
  layout `<head>` before first paint, preventing a flash of the wrong scheme.
- `src/lib/theme.tsx` provides a `ThemeProvider` and `useTheme` hook (no
  external dependency). The inline script and the provider share one rule for
  resolving the theme.

### Decision 3: Warm neutrals + one cobalt accent (single-accent lock)

All interface color comes from two families: warm neutrals (paper and ink,
hue 60 to 80) and cobalt (hue 255). Status colors (destructive red, success
green, warning amber) are semantic states, not accents. No second accent
family may be introduced; this keeps contrast predictable and the product
visually consistent.

### Decision 4: Typography roles via Geist and Geist Mono

Geist and Geist Mono are loaded through `next/font` (no new fonts). Three
roles: display (Geist, `tracking-tighter`, tight leading), sans (Geist body
and UI), mono (Geist Mono for labels, data, and index numbers, which carry the
"technical" register of technical-index).

### Decision 5: Tokenized motion gated by reduced motion

Durations (`--duration-fast` 150ms, `--duration-base` 200ms,
`--duration-slow` 300ms) and easings (`--ease-standard`,
`--ease-spring`) are tokens. Motion is purposeful (hierarchy, feedback, state
transition) and everything collapses under `prefers-reduced-motion: reduce`
via a token-layer override.

### Decision 6: 12/6/4 responsive grid convention

Mobile-first column convention without new breakpoints: 4 columns below
768px, 6 columns at md (768 to 1023px), 12 columns at lg (1024px and up),
using Tailwind's built-in `grid-cols-4/6/12`. The convention fixes the
breakpoint-to-column mapping; it does not alter Tailwind's breakpoints.

### Decision 7: Tokens are surface-agnostic

The token layer applies to all public and authenticated interfaces. It has no
schema or database impact; it is purely presentational. Components must
consume tokens and never hardcode color literals.

## Consequences

- Future UI work consumes tokens only; hardcoded hex in components is a
  review failure.
- The accessibility guardrail in `success-metrics.md` is served by a token
  contract test that asserts WCAG AA contrast (4.5:1) for every semantic pair
  in both modes.
- Theming has no third-party dependency and no runtime engine, keeping the
  bundle small and the flash-of-wrong-theme risk at zero.
- The single-accent lock constrains future color work; new status hues must
  be added as semantic status tokens, never as accent families.
- Reduced-motion behavior is enforced at the token layer, so components get
  it for free unless they opt out incorrectly.

Related: D-7 (decision log), `docs/design/design-tokens.md`,
`docs/product/charter.md` §5/§7, AGENTS.md §3/§5/§7, `docs/product/success-metrics.md`.
