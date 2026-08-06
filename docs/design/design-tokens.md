# FolioMuse Design Token Taxonomy

Source of truth for the design system tokens defined in `src/app/globals.css`.
Architecture and theming decisions: see ADR-0005. Product context: charter §5/§7.

Tokens are surface-agnostic: they apply to every public and authenticated
interface. UI code consumes tokens only, never hardcoded color literals.

## Naming convention

| Layer | Pattern | Example | Used for |
| --- | --- | --- | --- |
| Primitive | `--color-{ramp}-{step}` | `--color-cobalt-500` | Single source hues: paper (warm neutrals), ink (warm dark neutrals), cobalt (the one accent family) |
| Semantic | `--{role}` | `--background`, `--primary`, `--muted-foreground` | Roles shared by components; stable across modes |
| Status | `--{status}` | `--success`, `--warning`, `--info` | Semantic status colors, distinct from the accent |
| Motion | `--duration-{speed}` / `--ease-{name}` | `--duration-base`, `--ease-standard` | Durations and easing curves |
| Z-index | `--z-{context}` | `--z-modal` | Layer contexts (never arbitrary `z-50`) |
| Radius | `--radius-{scale}` | `--radius-lg` | Corner radii |
| Font | `--font-{role}` | `--font-display`, `--font-sans`, `--font-mono` | Typography roles |

## Primitive ramps

All colors are expressed in `oklch()` (CSS Color 4). The single accent family
is cobalt at hue 255. Warm neutrals sit at hue 60 to 80 (paper) and hue 60
(ink). Status hues: destructive at 25 to 27, success at 150, warning at 65 to 70.

| Ramp | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| paper | `0.985 0.005 80` | `0.968 0.006 80` | `0.938 0.008 80` | `0.89 0.01 80` | - | - | - | - | - | - | - |
| ink | - | - | - | - | - | - | `0.42 0.012 60` | `0.33 0.012 60` | `0.24 0.012 60` | - | `0.18 0.01 60` |
| cobalt | `0.965 0.018 255` | `0.93 0.04 255` | `0.86 0.075 255` | `0.76 0.12 255` | `0.65 0.155 255` | `0.55 0.18 255` | `0.49 0.19 255` | `0.44 0.19 255` | `0.38 0.16 255` | `0.32 0.13 255` | - |

Cells show the chroma/lightness arguments after the `oklch(` prefix.

## Semantic mapping (light mode)

| Token | Value |
| --- | --- |
| `--background` | paper-50 |
| `--foreground` | ink-950 |
| `--card` / `--popover` | paper-50 |
| `--card-foreground` / `--popover-foreground` | ink-950 |
| `--primary` | cobalt-600 |
| `--primary-foreground` | paper-50 |
| `--secondary` | paper-200 |
| `--secondary-foreground` | ink-900 |
| `--muted` | paper-100 |
| `--muted-foreground` | ink-700 |
| `--accent` | cobalt-100 |
| `--accent-foreground` | cobalt-800 |
| `--destructive` | `oklch(0.55 0.22 27)` |
| `--destructive-foreground` | `oklch(0.985 0.002 80)` |
| `--border` / `--input` | `oklch(0.91 0.01 75)` |
| `--ring` | cobalt-500 |
| `--success` | `oklch(0.55 0.15 150)` |
| `--warning` | `oklch(0.55 0.12 65)` |
| `--info` | cobalt-500 |
| `--success-foreground` / `--warning-foreground` / `--info-foreground` | `oklch(0.985 0.002 80)` |

## Semantic mapping (dark mode)

| Token | Value |
| --- | --- |
| `--background` | `oklch(0.16 0.01 60)` |
| `--foreground` | `oklch(0.97 0.006 80)` |
| `--card` | `oklch(0.19 0.012 60)` |
| `--popover` | `oklch(0.21 0.012 60)` |
| `--card-foreground` / `--popover-foreground` | `oklch(0.97 0.006 80)` |
| `--primary` | cobalt-500 |
| `--primary-foreground` | paper-50 |
| `--secondary` | `oklch(0.26 0.012 60)` |
| `--secondary-foreground` | `oklch(0.97 0.006 80)` |
| `--muted` | `oklch(0.24 0.012 60)` |
| `--muted-foreground` | `oklch(0.78 0.015 80)` |
| `--accent` | `oklch(0.24 0.03 255)` |
| `--accent-foreground` | cobalt-200 |
| `--destructive` | `oklch(0.7 0.19 25)` |
| `--destructive-foreground` | `oklch(0.16 0.008 60)` |
| `--border` | `oklch(0.29 0.012 60)` |
| `--input` | `oklch(0.3 0.014 60)` |
| `--ring` | cobalt-300 |
| `--success` | `oklch(0.74 0.15 150)` |
| `--warning` | `oklch(0.76 0.12 70)` |
| `--info` | cobalt-300 |
| `--success-foreground` / `--warning-foreground` / `--info-foreground` | `oklch(0.16 0.008 60)` |

Hierarchy parity rule: what pops in light mode pops in dark mode. The
foreground, secondary, and status foregrounds always contrast at 4.5:1 or
higher against their surfaces (enforced by the token contract tests).

## Grid convention (12/6/4)

Responsive column convention, mobile-first:

| Breakpoint | Range | Columns | Tailwind utility |
| --- | --- | --- | --- |
| base | under 768px | 4 | `grid-cols-4` |
| md | 768 to 1023px | 6 | `md:grid-cols-6` |
| lg | 1024px and up | 12 | `lg:grid-cols-12` |

Tailwind provides `grid-cols-12` / `grid-cols-6` / `grid-cols-4` out of the
box. The convention fixes WHICH breakpoint maps to WHICH column count; it does
not add new breakpoints (sm 640 / md 768 / lg 1024 stay as-is).

## Z-index scale

Systemic layer contexts only; arbitrary `z-50` is forbidden.

| Layer | Token | Value |
| --- | --- | --- |
| Base | - | 0 |
| Sticky | `--z-sticky` | 100 |
| Overlay | `--z-overlay` | 200 |
| Modal | `--z-modal` | 300 |
| Toast | `--z-toast` | 400 |
| Grain | `--z-grain` | 500 |

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--duration-fast` | 150ms | Hover, micro-interactions |
| `--duration-base` | 200ms | Default state transitions |
| `--duration-slow` | 300ms | Larger reveals, layout shifts |
| `--ease-standard` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default easing |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot only where purposefully playful |

Rules:

1. Motion must be purposeful: it communicates hierarchy, feedback, or a state
   transition. Decorative or perpetual animation is out of scope.
2. Everything collapses under `prefers-reduced-motion: reduce`. The token layer
   defines a reduced-motion override that neutralizes animation, transition,
   and scroll-behavior. Components must not re-enable motion outside it.

## Typography roles

No new fonts. Geist and Geist Mono are loaded via `next/font`.

| Role | Family | Usage |
| --- | --- | --- |
| Display | Geist, `tracking-tighter`, tight leading | Headlines, hero, large numerals |
| Sans | Geist | Body copy, UI controls |
| Mono | Geist Mono | Labels, data, index numbers (the technical in technical-index) |

Font variables: `--font-sans` (Geist), `--font-mono` (Geist Mono),
`--font-display` (alias of Geist for display sizing).
