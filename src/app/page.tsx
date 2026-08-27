import type { Metadata } from "next";

import { BentoFeatures } from "@/components/bento-features";
import { EditorialCollections } from "@/components/editorial-collections";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { McpExample } from "@/components/mcp-example";
import { NewNotable } from "@/components/new-notable";
import { NewsletterForm } from "@/components/newsletter-form";
import { RoleExplorer } from "@/components/role-explorer";
import { SearchHero } from "@/components/search-hero";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "FolioMuse - Portfolio inspiration, without the cloning",
  description:
    "A gallery-first entry point: real portfolios, sharpened by AI feedback, assembled with an agent.",
};

/**
 * FolioMuse homepage — redesigned with modern sections.
 *
 * PAGE-LEVEL STRUCTURE:
 *   - HeroSection: animated headline + CTAs + stats bar
 *   - SearchHero: direct search with autocomplete
 *   - NewNotable: top 6 quality-ranked portfolios
 *   - BentoFeatures: bento grid showing what FolioMuse offers
 *   - RoleExplorer: filter chips by profession
 *   - HowItWorks: 4-step process explanation
 *   - EditorialCollections: hand-picked portfolio sets
 *   - McpExample: agent conversation demo
 *   - NewsletterForm: email capture
 *   - Footer: enhanced with more links
 *
 * Server component — no client hooks here (interactivity lands with the
 * section components).
 */
export default function HomePage() {
  return (
    <>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
      >
        {/* ── 1. Hero (animated headline + CTAs + stats) ─────────────────── */}
        <HeroSection />

        {/* ── 2. Search (direct search with autocomplete) ────────────────── */}
        <SearchHero />

        {/* ── 3. New & notable (top 6 quality-ranked portfolios) ─────────── */}
        <NewNotable />

        {/* ── 4. Bento features (what FolioMuse offers) ──────────────────── */}
        <BentoFeatures />

        {/* ── 5. Role explorer (filter by profession) ────────────────────── */}
        <RoleExplorer />

        {/* ── 6. How it works (4-step process) ───────────────────────────── */}
        <HowItWorks />

        {/* ── 7. Editorial collections (hand-picked sets) ────────────────── */}
        <EditorialCollections />

        {/* ── 8. MCP example (agent conversation demo) ───────────────────── */}
        <McpExample />

        {/* ── 9. Newsletter ──────────────────────────────────────────────── */}
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

      {/* ── 10. Footer ──────────────────────────────────────────────────── */}
      <Footer />
    </>
  );
}
