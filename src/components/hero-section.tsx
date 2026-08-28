"use client";

import { motion } from "framer-motion";
import { ArrowRight, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useGalleryFacets } from "@/hooks/use-gallery-query";

/**
 * Enhanced hero section — saaspo.com + 21st.dev inspired.
 *
 * Animated headline with gradient text, clear CTAs, and live stats.
 * The existing SearchHero handles search; this replaces the static
 * masthead with a more dynamic, conversion-focused hero.
 */

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export function HeroSection() {
  const router = useRouter();
  const { facets } = useGalleryFacets();
  const [loadingRandom, setLoadingRandom] = useState(false);
  const totalPortfolios = facets?.total ?? facets?.roles.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const totalRoles = facets?.roles.length ?? 0;
  const totalStyles = facets?.styles.length ?? 0;

  const headlineWords = ["Build", "a", "portfolio", "that", "is", "genuinely", "your", "own."];

  async function handleRandom() {
    setLoadingRandom(true);
    try {
      const res = await fetch("/api/gallery/random");
      if (!res.ok) {
        // Fallback: navigate to browse if API fails
        router.push("/browse");
        return;
      }
      const data = (await res.json()) as { id?: string; error?: string };
      if (data.id) {
        router.push(`/gallery/${data.id}`);
      } else {
        router.push("/browse");
      }
    } catch {
      router.push("/browse");
    } finally {
      setLoadingRandom(false);
    }
  }

  return (
    <section
      aria-labelledby="hero-heading"
      data-testid="hero"
      className="relative flex flex-col items-center gap-8 py-16 text-center sm:py-20 lg:py-28"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary/10 to-transparent blur-3xl" />
        <div className="absolute right-0 top-1/2 h-[400px] w-[600px] -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-l from-amber-500/5 to-transparent blur-3xl" />
      </div>

      {/* Eyebrow */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 font-mono text-xs tracking-wide text-muted-foreground backdrop-blur-sm"
      >
        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        2,000+ real portfolios, AI-rated and curated
      </motion.p>

      {/* Animated headline */}
      <h1
        id="hero-heading"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-display text-4xl font-semibold tracking-tighter sm:text-5xl lg:text-6xl xl:text-7xl"
      >
        {headlineWords.map((word, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={wordVariants}
            initial="hidden"
            animate="visible"
            className={word === "genuinely" || word === "own." ? "text-gradient" : ""}
          >
            {word}
          </motion.span>
        ))}
      </h1>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="max-w-[55ch] text-lg leading-relaxed text-muted-foreground sm:text-xl"
      >
        Stop staring at a blank page. Browse real portfolios from designers,
        developers, and creators — then build yours with AI guidance.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.0 }}
        className="flex flex-col items-center gap-3 sm:flex-row"
      >
        <Link
          href="/browse"
          className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-mono text-sm font-medium tracking-wide text-background transition-all hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Explore the gallery
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <button
          type="button"
          onClick={handleRandom}
          disabled={loadingRandom}
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-6 py-3 font-mono text-sm font-medium tracking-wide text-foreground backdrop-blur-sm transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Shuffle className={`h-4 w-4 ${loadingRandom ? "animate-spin" : ""}`} />
          {loadingRandom ? "Finding..." : "Random portfolio"}
        </button>
      </motion.div>

      {/* Stats bar */}
      {totalPortfolios > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-full border border-border/50 bg-card/30 px-6 py-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-foreground">
              {totalPortfolios.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              portfolios
            </span>
          </div>
          <span className="text-border" aria-hidden>·</span>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-foreground">
              {totalRoles}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              professions
            </span>
          </div>
          <span className="text-border" aria-hidden>·</span>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-foreground">
              {totalStyles.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              styles
            </span>
          </div>
        </motion.div>
      )}
    </section>
  );
}
