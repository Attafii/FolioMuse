"use client";

import { motion } from "framer-motion";
import { Eye, Lightbulb, Palette, Search, Shuffle, Zap } from "lucide-react";

import { SectionHeader } from "@/components/section-header";

/**
 * Bento grid features section — 21st.dev inspired.
 *
 * Showcases what FolioMuse offers in a modern bento layout.
 * One large cell for the primary feature, smaller cells for secondary features.
 * Uses the existing spotlight-card CSS class for hover effects.
 */

const features = [
  {
    title: "Curated Gallery",
    description:
      "Real portfolios from real professionals. Every entry is reviewed, scored, and attributed — no fake data, no clones.",
    icon: Eye,
    className: "md:col-span-2 md:row-span-2",
    large: true,
  },
  {
    title: "AI-Powered Feedback",
    description:
      "The FolioMuse agent analyzes patterns across 3+ portfolios to sharpen your own draft — never copying, always synthesizing.",
    icon: Lightbulb,
    className: "md:col-span-1",
  },
  {
    title: "Smart Discovery",
    description:
      "Filter by role, style, or stack. Find portfolios that match your craft and aesthetic in seconds.",
    icon: Search,
    className: "md:col-span-1",
  },
  {
    title: "Random Inspiration",
    description:
      "Stuck? Hit the random button and land on a portfolio you'd never have found otherwise.",
    icon: Shuffle,
    className: "md:col-span-1",
  },
  {
    title: "Design Intelligence",
    description:
      "Section patterns, layout strategies, and structural insights extracted from the best portfolios.",
    icon: Palette,
    className: "md:col-span-1",
  },
  {
    title: "Instant Assembly",
    description:
      "Go from inspiration to a finished portfolio draft in minutes, not weeks. The agent assembles, you refine.",
    icon: Zap,
    className: "md:col-span-1",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function BentoFeatures() {
  return (
    <section
      aria-labelledby="bento-features-heading"
      data-testid="bento-features"
      className="flex flex-col gap-8"
    >
      <SectionHeader
        id="bento-features-heading"
        eyebrow="Why FolioMuse"
        title="Everything you need to build a standout portfolio"
        description="From discovery to assembly — one platform, zero cloning."
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className={`spotlight-card group flex flex-col justify-between gap-4 p-6 sm:p-8 ${feature.className}`}
            >
              <div className="spotlight-inner flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-card-foreground">
                    {feature.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed text-muted-foreground ${
                      feature.large ? "max-w-[45ch]" : ""
                    }`}
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
              {feature.large && (
                <div className="spotlight-inner mt-auto flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 backdrop-blur-sm">
                  <div className="flex -space-x-2">
                    {["D", "F", "B", "M"].map((letter, i) => (
                      <div
                        key={letter}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary/20 font-mono text-xs font-bold text-primary"
                        style={{ zIndex: 4 - i }}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    50+ portfolios reviewed
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
