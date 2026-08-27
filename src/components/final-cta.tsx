"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bot, BookOpen, Shuffle } from "lucide-react";
import Link from "next/link";

/**
 * Final CTA section — drives users to take action.
 *
 * Clean, focused call-to-action before the footer.
 * Uses gradient background and clear buttons.
 */

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      data-testid="final-cta"
      className="relative overflow-hidden rounded-2xl border border-border"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

      <div className="relative flex flex-col items-center gap-8 px-6 py-16 text-center sm:px-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 font-mono text-xs tracking-wide text-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            Ready to build?
          </span>

          <h2
            id="final-cta-heading"
            className="font-display text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl"
          >
            Your portfolio starts here
          </h2>

          <p className="max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
            Browse real examples, get AI-powered feedback, and assemble a
            portfolio that is genuinely your own.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/browse"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-mono text-sm font-medium tracking-wide text-background transition-all hover:bg-foreground/90"
          >
            Explore the gallery
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/random"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-6 py-3 font-mono text-sm font-medium tracking-wide text-foreground backdrop-blur-sm transition-all hover:bg-muted"
          >
            <Shuffle className="h-4 w-4" />
            Random portfolio
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6"
        >
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read the docs
          </Link>
          <Link
            href="/docs#mcp-agent"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Bot className="h-3.5 w-3.5" />
            MCP agent
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
