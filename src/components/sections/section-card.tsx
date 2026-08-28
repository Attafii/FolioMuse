"use client";

import { motion } from "framer-motion";
import type { SectionCard } from "@/domain/curation/section-schemas";

interface SectionCardViewProps {
  section: SectionCard;
  onClick: () => void;
}

export function SectionCardView({ section, onClick }: SectionCardViewProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
    >
      {/* Preview image */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {section.desktopCropUrl ? (
          <img
            src={section.desktopCropUrl}
            alt={`${section.sectionType} section by ${section.creatorName}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-muted-foreground">No preview</span>
          </div>
        )}
        {/* Section type badge */}
        <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
          {section.sectionType}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="font-display text-sm font-semibold leading-tight line-clamp-1">
          {section.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          by {section.creatorName} · {section.creatorRole}
        </p>
      </div>
    </motion.button>
  );
}
