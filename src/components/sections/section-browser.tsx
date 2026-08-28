"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeroIcon,
  GridIcon,
  TimelineIcon,
  ContactIcon,
  AboutIcon,
  FooterIcon,
  StatsIcon,
  NavIcon,
  GalleryIcon,
  TestimonialIcon,
} from "./section-icons";
import { SectionCardView } from "./section-card";
import { SectionDetailModal } from "./section-detail-modal";
import { SectionAnalyzer } from "./section-analyzer";
import type { SectionCard, SectionType } from "@/domain/curation/section-schemas";

const SECTION_TYPES: { type: SectionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "hero", label: "Hero", icon: HeroIcon },
  { type: "project grid", label: "Projects", icon: GridIcon },
  { type: "timeline", label: "Timeline", icon: TimelineIcon },
  { type: "contact CTA", label: "Contact", icon: ContactIcon },
  { type: "about", label: "About", icon: AboutIcon },
  { type: "footer", label: "Footer", icon: FooterIcon },
  { type: "stats", label: "Stats", icon: StatsIcon },
  { type: "navigation", label: "Navigation", icon: NavIcon },
  { type: "gallery", label: "Gallery", icon: GalleryIcon },
  { type: "testimonial", label: "Testimonial", icon: TestimonialIcon },
];

export function SectionBrowser() {
  const [activeType, setActiveType] = useState<SectionType>("hero");
  const [sections, setSections] = useState<SectionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/sections?sectionType=${encodeURIComponent(activeType)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load sections");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setSections(data.items ?? []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [activeType]);

  return (
    <div className="flex flex-col gap-8">
      {/* Section type tabs */}
      <div className="flex flex-wrap gap-2">
        {SECTION_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              activeType === type
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-ring/60 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-video w-full shimmer" />
              <div className="flex flex-col gap-2 p-4">
                <div className="h-4 w-3/4 rounded shimmer" />
                <div className="h-3 w-1/2 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-medium">No sections yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Section examples will appear once portfolios are curated.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sections.map((section) => (
              <SectionCardView
                key={section.id}
                section={section}
                onClick={() => setSelectedId(section.id)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Section analyzer */}
      <SectionAnalyzer />

      {/* Detail modal */}
      {selectedId && (
        <SectionDetailModal
          sectionId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
