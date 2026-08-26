import type { Metadata } from "next";

import { McpExample } from "@/components/mcp-example";
import { NewNotable } from "@/components/new-notable";
import { NewsletterForm } from "@/components/newsletter-form";
import { EditorialCollections } from "@/components/editorial-collections";
import { Footer } from "@/components/footer";
import { RoleExplorer } from "@/components/role-explorer";
import { SearchHero } from "@/components/search-hero";
import { SectionExplorer } from "@/components/section-explorer";
import { SubmissionCriteria } from "@/components/submission-criteria";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
    title: "FolioMuse - Portfolio inspiration, without the cloning",
  description:
    "A gallery-first entry point: real portfolios, sharpened by AI feedback, assembled with an agent.",
};

/**
 * FolioMuse homepage (Section 02 Â· Experience design, plan T7).
 * Gallery-first entry point.
 *
 * PAGE-LEVEL STRUCTURE (this file fixes the skeleton â€” section components
 * land in T8-T15):
 *   - Skip link â†’ #main-content
 *   - Single <h1> in the masthead; every other section uses <h2> via
 *     SectionHeader
 *   - Each <section> carries data-testid + aria-labelledby wired to its
 *     heading id
 *   - Empty-state copy per section (real tokens, no fake data)
 *
 * Server component â€” no client hooks here (interactivity lands with the
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
        {/* â”€â”€ 1. Masthead / hero (T8: direct search hero) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <SearchHero />

        {/* â”€â”€ 2. New & notable (T9: GalleryCard grid) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <NewNotable />

        {/* â”€â”€ 3. Role explorer (T10) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <RoleExplorer />

        {/* â”€â”€ 4. Section explorer (T11) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <SectionExplorer />

        {/* â”€â”€ 5. Editorial collections (T12) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <EditorialCollections />

        {/* â”€â”€ 6. MCP example (T13) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <McpExample />

        {/* â”€â”€ 7. Submission criteria (T14) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <SubmissionCriteria />

        {/* â”€â”€ 8. Newsletter (T15) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
          <NewsletterForm />
        </section>
      </main>

      {/* â”€â”€ 9. Footer (T16) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Footer />
    </>
  );
}
