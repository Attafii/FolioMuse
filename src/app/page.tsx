import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * FolioMuse design-system reference page (Section 02, ADR-0005).
 * Demonstrates and verifies the token layer: color, typography, grid,
 * buttons, status badges, surfaces, motion, and accessibility.
 * Server component; the theme toggle is the only client boundary.
 */
export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 lg:px-8">
      {/* 1. Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">FolioMuse</p>
          <h1 className="font-display text-3xl font-semibold tracking-tighter sm:text-4xl">
            Design system reference
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Light and dark mode
          </span>
          <ThemeToggle />
        </div>
      </header>

      <p className="-mt-8 max-w-2xl text-muted-foreground">
        This page exercises the token layer from src/app/globals.css. Switch
        themes with the toggle above to inspect both modes. Every color on this
        page is a token, never a hardcoded value.
      </p>

      {/* 2. Color */}
      <section aria-labelledby="color-heading">
        <h2 id="color-heading" className="font-display text-2xl font-semibold tracking-tight">
          Color
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Semantic tokens and the primitive ramps they select from. Warm
          neutral foundations with a single cobalt accent.
        </p>

        <h3 className="mt-6 font-mono text-sm text-muted-foreground">Semantic</h3>
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {[
            ["background", "var(--background)"],
            ["foreground", "var(--foreground)"],
            ["primary", "var(--primary)"],
            ["secondary", "var(--secondary)"],
            ["muted", "var(--muted)"],
            ["accent", "var(--accent)"],
            ["destructive", "var(--destructive)"],
            ["success", "var(--success)"],
            ["warning", "var(--warning)"],
            ["info", "var(--info)"],
            ["border", "var(--border)"],
            ["ring", "var(--ring)"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div
                className="h-10 rounded-md border border-border"
                style={{ backgroundColor: value }}
                aria-hidden
              />
              <span className="font-mono text-xs">{label}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-6 font-mono text-sm text-muted-foreground">Cobalt ramp</h3>
        <div className="mt-3 grid grid-cols-5 gap-3 lg:grid-cols-10">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => (
            <div key={step} className="flex flex-col gap-1.5">
              <div
                className="h-10 rounded-md border border-border"
                style={{ backgroundColor: `var(--cobalt-${step})` }}
                aria-hidden
              />
              <span className="font-mono text-xs">{step}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-6 font-mono text-sm text-muted-foreground">Warm neutrals</h3>
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-12">
          {[
            ["paper-50", "var(--paper-50)"],
            ["paper-100", "var(--paper-100)"],
            ["paper-200", "var(--paper-200)"],
            ["paper-300", "var(--paper-300)"],
            ["ink-700", "var(--ink-700)"],
            ["ink-800", "var(--ink-800)"],
            ["ink-900", "var(--ink-900)"],
            ["ink-950", "var(--ink-950)"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div
                className="h-10 rounded-md border border-border"
                style={{ backgroundColor: value }}
                aria-hidden
              />
              <span className="font-mono text-xs">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Typography */}
      <section aria-labelledby="type-heading">
        <h2 id="type-heading" className="font-display text-2xl font-semibold tracking-tight">
          Typography
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Geist in three roles: display, sans, and mono. Mono carries labels
          and index numbers, the technical register of the direction.
        </p>
        <div className="mt-6 space-y-6">
          <div>
            <p className="font-mono text-xs text-muted-foreground">Display</p>
            <p className="font-display text-4xl font-semibold tracking-tighter sm:text-6xl">
              A portfolio, honestly yours
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground">Sans body</p>
            <p className="max-w-prose text-base leading-relaxed">
              FolioMuse pairs real examples with sharp AI feedback so a
              portfolio gets assembled, not guessed. The gallery exists to
              inspire, never to enable one-to-one duplication.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground">Mono, data</p>
            <p className="font-mono text-sm">
              index 0421 / status accepted / 12 columns at 1024px
            </p>
          </div>
        </div>
      </section>

      {/* 4. Grid */}
      <section aria-labelledby="grid-heading">
        <h2 id="grid-heading" className="font-display text-2xl font-semibold tracking-tight">
          Grid
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The 12/6/4 convention: 12 columns at 1024px and up, 6 at 768 to
          1023px, 4 below 768px. Resize the window to watch the tiles reflow.
        </p>
        <div className="mt-6 grid grid-cols-4 gap-3 md:grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="h-12 rounded-md border border-border bg-muted font-mono text-xs text-muted-foreground flex items-center justify-center"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </section>

      {/* 5. Buttons */}
      <section aria-labelledby="buttons-heading">
        <h2 id="buttons-heading" className="font-display text-2xl font-semibold tracking-tight">
          Buttons
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every variant below is token-driven. Tab through them to see the
          cobalt focus ring, press them for the active state, and try the
          disabled and loading states.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button disabled>Disabled</Button>
          <Button disabled aria-busy="true">
            <Loader2 className="animate-spin" aria-hidden />
            Loading
          </Button>
          <Button aria-invalid="true">Invalid field</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          The loading button uses aria-busy and the Loader2 spinner; motion
          collapses under prefers-reduced-motion.
        </p>
      </section>

      {/* 6. Status */}
      <section aria-labelledby="status-heading">
        <h2 id="status-heading" className="font-display text-2xl font-semibold tracking-tight">
          Status
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Semantic badges for feedback. Contrast is contract-tested at 4.5:1 in
          both modes.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="error">Error</Badge>
        </div>
      </section>

      {/* 7. Surfaces */}
      <section aria-labelledby="surfaces-heading">
        <h2 id="surfaces-heading" className="font-display text-2xl font-semibold tracking-tight">
          Surfaces
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cards use the card tokens with a restrained radius. The hover variant
          shifts border and surface, never a black shadow.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Default card</CardTitle>
              <CardDescription>A quiet surface for static content.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Card foreground sits on the card token with border-border
                defining the edge.
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline" size="sm">
                Open
              </Button>
            </CardFooter>
          </Card>
          <Card variant="hover">
            <CardHeader>
              <CardTitle>Hover card</CardTitle>
              <CardDescription>Hover to see the border and surface shift.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The transition uses a 150ms token duration and collapses under
                reduced motion.
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline" size="sm">
                Open
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 8. Motion */}
      <section aria-labelledby="motion-heading">
        <h2 id="motion-heading" className="font-display text-2xl font-semibold tracking-tight">
          Motion
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tokenized duration and easing. Hover the tile below; under
          prefers-reduced-motion every transition collapses to a single frame.
        </p>
        <div className="mt-6">
          <div className="inline-block rounded-lg border border-border bg-card px-6 py-4 text-sm font-medium transition-transform duration-(--duration-base) ease-(--ease-standard) hover:-translate-y-1">
            Hover me
          </div>
        </div>
      </section>

      {/* 9. Accessibility */}
      <section aria-labelledby="a11y-heading">
        <h2 id="a11y-heading" className="font-display text-2xl font-semibold tracking-tight">
          Accessibility
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Focus order follows the document order of this page.</li>
          <li>Every interactive element has a visible focus ring in both modes.</li>
          <li>The theme toggle has an aria-label that describes the action.</li>
          <li>All motion collapses under prefers-reduced-motion.</li>
          <li>Contrast pairs are enforced by the token contract test suite.</li>
        </ul>
      </section>
    </main>
  );
}
