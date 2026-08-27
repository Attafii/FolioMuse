"use client";

import { motion } from "framer-motion";
import { BarChart3, Briefcase, Clock, TrendingUp } from "lucide-react";

import { SectionHeader } from "@/components/section-header";

/**
 * Why portfolios matter — social proof / stats section.
 *
 * Shows compelling stats about why portfolios matter for career growth.
 * Uses animated counters and clean card layout.
 */

const stats = [
  {
    icon: Briefcase,
    value: "76%",
    label: "of hiring managers",
    description: "say a portfolio is more important than a resume when evaluating candidates.",
  },
  {
    icon: TrendingUp,
    value: "3x",
    label: "more interviews",
    description: "candidates with strong portfolios receive compared to those without.",
  },
  {
    icon: Clock,
    value: "6 sec",
    label: "average attention",
    description: "is what you have to make an impression. Structure and clarity matter.",
  },
  {
    icon: BarChart3,
    value: "89%",
    label: "of designers",
    description: "say studying real examples helped them improve their own portfolio.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

export function WhyPortfoliosMatter() {
  return (
    <section
      aria-labelledby="why-portfolios-heading"
      data-testid="why-portfolios"
      className="flex flex-col gap-8"
    >
      <SectionHeader
        id="why-portfolios-heading"
        eyebrow="The data"
        title="Why portfolios matter"
        description="In today's competitive market, a strong portfolio is your most powerful career tool."
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="spotlight-card group flex flex-col gap-4 p-6"
            >
              <div className="spotlight-inner flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
