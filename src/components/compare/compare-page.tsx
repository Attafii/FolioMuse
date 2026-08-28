"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Star, ExternalLink } from "lucide-react";
import Link from "next/link";

import { useGalleryQuery } from "@/hooks/use-gallery-query";
import type { GalleryItemSummary } from "@/domain/curation/types";

/**
 * Compare page — side-by-side portfolio comparison.
 *
 * Users can add up to 3 portfolios to compare.
 * Shows key metrics side by side.
 */

const MAX_COMPARE = 3;

function qualityToStars(level: string): number {
  const map: Record<string, number> = { L0: 1, L1: 2, L2: 3, L3: 4, L4: 5 };
  return map[level] ?? 3;
}

export function ComparePage() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const { items } = useGalleryQuery({ pageSize: 100 });
  const compareItems = items.filter((item) => compareIds.includes(item.id));

  function addItem(id: string) {
    if (compareIds.length >= MAX_COMPARE) return;
    if (compareIds.includes(id)) return;
    setCompareIds([...compareIds, id]);
    setShowPicker(false);
  }

  function removeItem(id: string) {
    setCompareIds(compareIds.filter((i) => i !== id));
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Add button */}
      {compareIds.length < MAX_COMPARE && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add portfolio ({compareIds.length}/{MAX_COMPARE})
          </button>
          {compareIds.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add portfolios to compare them side-by-side.
            </p>
          )}
        </div>
      )}

      {/* Picker */}
      {showPicker && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <h3 className="mb-3 text-sm font-medium">Select a portfolio</h3>
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((item) => !compareIds.includes(item.id))
              .slice(0, 20)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id)}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                    <span className="text-lg font-bold text-muted-foreground">
                      {item.attribution.creatorName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.attribution.creatorName}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </motion.div>
      )}

      {/* Comparison grid */}
      {compareItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {compareItems.map((item) => (
            <CompareCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
          ))}
        </div>
      ) : (
        !showPicker && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
            <div className="text-center">
              <p className="font-display text-lg font-medium">No portfolios to compare</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Add portfolios using the button above.
              </p>
              <Link
                href="/browse"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse portfolios
              </Link>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function CompareCard({ item, onRemove }: { item: GalleryItemSummary; onRemove: () => void }) {
  const stars = qualityToStars(item.qualityLevel);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-destructive"
        aria-label="Remove from comparison"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Image */}
      <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
        {item.mediaUrl ? (
          <img
            src={item.mediaUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground/30">
              {item.attribution.creatorName.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.attribution.creatorName}</p>
        </div>

        {/* Metrics */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Role</span>
            <span className="text-sm font-medium">{item.creatorRole}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Quality</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Styles</span>
            <div className="flex flex-wrap justify-end gap-1">
              {item.styleTags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Stack</span>
            <div className="flex flex-wrap justify-end gap-1">
              {item.stackTags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Link */}
        <a
          href={item.attribution.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/80"
        >
          <ExternalLink className="h-4 w-4" />
          Visit portfolio
        </a>
      </div>
    </motion.div>
  );
}
