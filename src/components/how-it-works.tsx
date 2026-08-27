"use client";

import { motion } from "framer-motion";
import { ArrowRight, Compass, Lightbulb, PenTool, Send } from "lucide-react";

import { SectionHeader } from "@/components/section-header";

/**
 * How It Works section — saaspo.com inspired.
 *
 * Clean 4-step process showing how FolioMuse works.
 * Uses numbered steps with icons and connecting lines.
 */

const steps = [
  {
    number: "01",
    title: "Discover",
    description:
      "Browse the curated gallery. Filter by role, style, or stack. Find portfolios that resonate with your craft.",
    icon: Compass,
  },
  {
    number: "02",
    title: "Study",
    description:
      "Analyze what makes great portfolios work. Section patterns, layout strategies, and structural insights.",
    icon: Lightbulb,
  },
  {
    number: "03",
    title: "Draft",
    description:
      "Start your own portfolio draft. The agent helps you structure sections and sharpen your narrative.",
    icon: PenTool,
  },
  {
    number: "04",
    title: "Assemble",
    description:
      "Go from draft to polished portfolio in minutes. The agent assembles, you refine and ship.",
    icon: Send,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      data-testid="how-it-works"
      className="flex flex-col gap-8"
    >
      <SectionHeader
        id="how-it-works-heading"
        eyebrow="Process"
        title="How FolioMuse works"
        description="From discovery to a finished portfolio — four simple steps."
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Connecting line (desktop only) */}
        <div className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className="spotlight-card group relative flex flex-col gap-4 p-6"
            >
              <div className="spotlight-inner flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Step {step.number}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-card-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="flex justify-center">
        <a
          href="/browse"
          className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-mono text-sm font-medium tracking-wide text-background transition-all hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Start exploring
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </section>
  );
}
