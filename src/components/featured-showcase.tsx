"use client";

import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/section-header";
import { useGalleryQuery } from "@/hooks/use-gallery-query";
import { roleChipStyle } from "@/lib/design/roles";

/**
 * Featured showcase — highlights top-quality portfolios.
 *
 * Shows the top 3 L4/L3 portfolios in a large featured layout.
 * Uses the existing gallery query hook for data.
 */

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

export function FeaturedShowcase() {
  const { items, loading } = useGalleryQuery({
    sort: "quality",
    pageSize: 3,
  });

  const featured = items.filter((item) =>
    item.qualityLevel === "L4" || item.qualityLevel === "L3"
  ).slice(0, 3);

  if (loading || featured.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-heading"
      data-testid="featured-showcase"
      className="flex flex-col gap-8"
    >
      <SectionHeader
        id="featured-heading"
        eyebrow="Spotlight"
        title="Featured portfolios"
        description="Hand-picked examples of exceptional craft and structure."
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {featured.map((item, index) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            className={`spotlight-card group flex flex-col overflow-hidden ${
              index === 0 ? "lg:col-span-2 lg:row-span-2" : ""
            }`}
          >
            <div className="spotlight-inner flex flex-1 flex-col">
              {/* Media */}
              <div className="relative overflow-hidden">
                <a
                  href={item.attribution.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  {item.mediaUrl ? (
                    <img
                      src={item.mediaUrl}
                      alt={`${item.title} by ${item.attribution.creatorName}`}
                      loading="lazy"
                      className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                        index === 0 ? "aspect-[16/9]" : "aspect-[16/10]"
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex items-center justify-center bg-muted ${
                        index === 0 ? "aspect-[16/9]" : "aspect-[16/10]"
                      }`}
                      style={roleChipStyle(item.creatorRole)}
                    >
                      <span className="font-display text-4xl font-bold opacity-30">
                        {item.attribution.creatorName.charAt(0)}
                      </span>
                    </div>
                  )}
                </a>
                {/* Quality badge */}
                <div className="absolute right-3 top-3">
                  <Badge variant="success" className="font-mono text-xs">
                    <Star className="mr-1 h-3 w-3" />
                    {item.qualityLevel}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-card-foreground">
                    <a
                      href={`/gallery/${item.id}`}
                      className="transition-colors hover:text-primary"
                    >
                      {item.title}
                    </a>
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.attribution.creatorName}
                  </p>
                  <span
                    className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide"
                    style={roleChipStyle(item.creatorRole)}
                  >
                    {item.creatorRole}
                  </span>
                </div>

                {item.styleTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.styleTags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rounded-full font-mono text-[11px]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <a
                    href={item.attribution.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View portfolio
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="flex justify-center">
        <Link
          href="/browse"
          className="group inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-all hover:bg-muted"
        >
          View all portfolios
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
