import type { Metadata } from "next";

import { BentoFeatures } from "@/components/bento-features";
import { EditorialCollections } from "@/components/editorial-collections";
import { FeaturedShowcase } from "@/components/featured-showcase";
import { FinalCta } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { McpExample } from "@/components/mcp-example";
import { NewNotable } from "@/components/new-notable";
import { NewsletterForm } from "@/components/newsletter-form";
import { PortfolioOfTheDay } from "@/components/portfolio-of-the-day";
import { RoleExplorer } from "@/components/role-explorer";
import { SearchHero } from "@/components/search-hero";
import { SectionHeader } from "@/components/section-header";
import { WhyPortfoliosMatter } from "@/components/why-portfolios-matter";

export const metadata: Metadata = {
  title: "FolioMuse — Portfolio Inspiration Gallery | 2,000+ Real Portfolios",
  description:
    "Browse 2,000+ real portfolios from designers, developers, and creators. AI-rated, curated, and ready to inspire your next project. Find portfolio examples by role, style, or tech stack.",
  openGraph: {
    title: "FolioMuse — Portfolio Inspiration Gallery | 2,000+ Real Portfolios",
    description:
      "Browse 2,000+ real portfolios from designers, developers, and creators. AI-rated, curated, and ready to inspire your next project.",
  },
};

/**
 * FolioMuse homepage — redesigned with modern sections.
 *
 * PAGE-LEVEL STRUCTURE:
 *   1. HeroSection: animated headline + CTAs + stats bar
 *   2. SearchHero: centered search with autocomplete
 *   3. NewNotable: top 6 quality-ranked portfolios
 *   4. WhyPortfoliosMatter: stats about portfolio importance
 *   5. BentoFeatures: bento grid showing what FolioMuse offers
 *   6. FeaturedShowcase: top 3 L3/L4 portfolios in spotlight
 *   7. RoleExplorer: filter chips by profession
 *   8. HowItWorks: 4-step process explanation
 *   9. EditorialCollections: hand-picked portfolio sets
 *   10. McpExample: agent conversation demo
 *   11. NewsletterForm: email capture
 *   12. FinalCta: call-to-action before footer
 *   13. Footer: enhanced with more links
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

        {/* ── 2. Search (centered search with autocomplete) ──────────────── */}
        <SearchHero />

        {/* ── 2.5. Portfolio of the Day (featured spotlight) ─────────────── */}
        <PortfolioOfTheDay />

        {/* ── 3. New & notable (top 6 quality-ranked portfolios) ─────────── */}
        <NewNotable />

        {/* ── 4. Why portfolios matter (stats & social proof) ────────────── */}
        <WhyPortfoliosMatter />

        {/* ── 5. Bento features (what FolioMuse offers) ──────────────────── */}
        <BentoFeatures />

        {/* ── 6. Featured showcase (top L3/L4 portfolios) ────────────────── */}
        <FeaturedShowcase />

        {/* ── 7. Role explorer (filter by profession) ────────────────────── */}
        <RoleExplorer />

        {/* ── 8. How it works (4-step process) ───────────────────────────── */}
        <HowItWorks />

        {/* ── 9. Editorial collections (hand-picked sets) ────────────────── */}
        <EditorialCollections />

        {/* ── 10. MCP example (agent conversation demo) ──────────────────── */}
        <McpExample />

        {/* ── 11. Newsletter ─────────────────────────────────────────────── */}
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

        {/* ── 12. Final CTA ──────────────────────────────────────────────── */}
        <FinalCta />
      </main>

      {/* ── 13. Footer ──────────────────────────────────────────────────── */}
      <Footer />
    </>
  );
}
