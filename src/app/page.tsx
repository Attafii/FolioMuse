import type { Metadata } from "next";

import { Masthead } from "@/components/masthead";
import { McpExample } from "@/components/mcp-example";
import { NewNotable } from "@/components/new-notable";
import { EditorialCollections } from "@/components/editorial-collections";
import { RoleExplorer } from "@/components/role-explorer";
import { SearchHero } from "@/components/search-hero";
import { SectionExplorer } from "@/components/section-explorer";
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

      <Masthead />

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
      >
        {/* ── 1. Masthead / hero (T8: direct search hero) ───────────────── */}
        <SearchHero />

        {/* ── 2. New & notable (T9: GalleryCard grid) ──────────────────── */}
        <NewNotable />

        {/* ── 3. Role explorer (T10) ───────────────────────────────────── */}
        <RoleExplorer />

        {/* ── 4. Section explorer (T11) ────────────────────────────────── */}
        <SectionExplorer />

        {/* ── 5. Editorial collections (T12) ───────────────────────────── */}
        <EditorialCollections />

        {/* ── 6. MCP example (T13) ─────────────────────────────────────── */}
        <McpExample />

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
