import type { Metadata } from "next";

import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "FolioMuse — Portfolio inspiration, without the cloning",
  description:
    "A gallery-first entry point: real portfolios, sharpened by AI feedback, assembled with an agent.",
};

/**
 * FolioMuse homepage (Section 02 · Experience design, plan T7).
 * Gallery-first entry point.
 *
 * PAGE-LEVEL STRUCTURE (this file fixes the skeleton — section components
 * land in T8-T15):
 *   - Skip link → #main-content
 *   - Single <h1> in the masthead; every other section uses <h2> via
 *     SectionHeader
 *   - Each <section> carries data-testid + aria-labelledby wired to its
 *     heading id
 *   - Empty-state copy per section (real tokens, no fake data)
 *
 * Server component — no client hooks here (interactivity lands with the
 * section components in later tasks).
 */
export default function HomePage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-sticky)] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
      >
        {/* ── 1. Masthead / hero (T8: direct search hero) ───────────────── */}
        <section
          aria-labelledby="masthead-heading"
          data-testid="masthead"
          className="flex flex-col gap-6 py-12 sm:py-16"
        >
          <p className="font-mono text-sm text-muted-foreground">FolioMuse</p>
          <h1
            id="masthead-heading"
            className="font-display max-w-3xl text-4xl font-semibold tracking-tighter sm:text-5xl lg:text-6xl"
          >
            A gallery of portfolios worth learning from.
          </h1>
          <p className="max-w-[65ch] text-lg leading-relaxed text-muted-foreground">
            Real portfolios, sharpened by AI feedback, assembled with an
            agent. Find your starting point here.
          </p>
        </section>

        {/* ── 2. New & notable (T9: GalleryCard grid) ──────────────────── */}
        <section
          aria-labelledby="new-notable-heading"
          data-testid="new-notable"
          className="flex flex-col gap-8"
        >
          <SectionHeader
            id="new-notable-heading"
            title="New and notable"
            description="Freshly reviewed portfolios from the curation queue."
          />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-medium text-card-foreground">
              No accepted portfolios yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first. The gallery fills after the first curation review.
            </p>
          </div>
        </section>

        {/* ── 3. Role explorer (T10) ───────────────────────────────────── */}
        <section
          aria-labelledby="role-explorer-heading"
          data-testid="role-explorer"
          className="flex flex-col gap-8"
        >
          <SectionHeader
            id="role-explorer-heading"
            eyebrow="By role"
            title="Explore portfolios by role"
            description="Product designers, developers, illustrators, and more."
          />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-medium text-card-foreground">
              Roles appear once portfolios are accepted.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Each role links to the portfolios that fit it.
            </p>
          </div>
        </section>

        {/* ── 4. Section explorer (T11) ────────────────────────────────── */}
        <section
          aria-labelledby="section-explorer-heading"
          data-testid="section-explorer"
          className="flex flex-col gap-8"
        >
          <SectionHeader
            id="section-explorer-heading"
            title="Browse by portfolio section"
            description="Jump straight to the part of a portfolio you want to study."
          />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-medium text-card-foreground">
              Sections appear once portfolios are accepted.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore how others structure their work.
            </p>
          </div>
        </section>

        {/* ── 5. Editorial collections (T12) ───────────────────────────── */}
        <section
          aria-labelledby="collections-heading"
          data-testid="editorial-collections"
          className="flex flex-col gap-8"
        >
          <SectionHeader
            id="collections-heading"
            eyebrow="Curated"
            title="Editorial collections"
            description="Hand-picked sets of portfolios around a theme."
          />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-medium text-card-foreground">
              Collections appear once the gallery has enough accepted work.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Curated from patterns across many portfolios, never a single
              source.
            </p>
          </div>
        </section>

        {/* ── 6. MCP example (T13) ─────────────────────────────────────── */}
        <section
          aria-labelledby="mcp-example-heading"
          data-testid="mcp-example"
          className="flex flex-col gap-8"
        >
          <SectionHeader
            id="mcp-example-heading"
            title="See the FolioMuse agent at work"
            description="A concrete example of building a portfolio with the agent."
          />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-medium text-card-foreground">
              The example appears once gallery data is available.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Illustrative only - it shows the workflow, not a finished
              portfolio.
            </p>
          </div>
        </section>

        {/* ── 7. Submission criteria (T14) ─────────────────────────────── */}
        <section
          aria-labelledby="submission-criteria-heading"
          data-testid="submission-criteria"
          className="flex flex-col gap-8"
        >
          <SectionHeader
            id="submission-criteria-heading"
            title="What we accept"
            description="The bar for getting into the gallery."
          />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-medium text-card-foreground">
              Criteria are on their way.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Attribution preserved, quality reviewed, consent respected.
            </p>
          </div>
        </section>

        {/* ── 8. Newsletter (T15) ──────────────────────────────────────── */}
        <section
          aria-labelledby="newsletter-heading"
          data-testid="newsletter"
          className="flex flex-col gap-8"
        >
          <SectionHeader
            id="newsletter-heading"
            title="Stay in the loop"
            description="Occasional notes on the gallery and the agent."
          />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-medium text-card-foreground">
              The newsletter form lands here.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              No noise. Just the collections worth seeing.
            </p>
          </div>
        </section>
      </main>

      {/* ── 9. Footer (T16) ────────────────────────────────────────────── */}
      <footer
        data-testid="footer"
        className="border-t border-border"
        aria-label="Site footer"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-mono text-sm text-muted-foreground">FolioMuse</p>
          <p className="text-sm text-muted-foreground">
            A gallery that inspires, not clones.
          </p>
        </div>
      </footer>
    </>
  );
}
