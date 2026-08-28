"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, AlertTriangle } from "lucide-react";
import type { SectionDetail } from "@/domain/curation/section-schemas";

interface SectionDetailModalProps {
  sectionId: string;
  onClose: () => void;
}

export function SectionDetailModal({ sectionId, onClose }: SectionDetailModalProps) {
  const [detail, setDetail] = useState<SectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sections/${sectionId}`)
      .then((res) => res.json())
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sectionId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-2 backdrop-blur-sm transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !detail ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Section not found</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Preview */}
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {detail.desktopCropUrl ? (
                  <img
                    src={detail.desktopCropUrl}
                    alt={`${detail.sectionType} by ${detail.creatorName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-muted-foreground">No preview</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div>
                  <span className="inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {detail.sectionType}
                  </span>
                  <h2 className="mt-2 font-display text-xl font-semibold">
                    {detail.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    by {detail.creatorName} · {detail.creatorRole}
                  </p>
                </div>

                {/* Lessons */}
                {detail.lessons.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Key Lessons
                    </h3>
                    <div className="flex flex-col gap-2">
                      {detail.lessons.map((lesson, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
                        >
                          <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {lesson.code}
                          </span>
                          <p className="text-sm">{lesson.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Do not copy note */}
                {detail.doNotCopyNote && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Important
                        </h4>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                          {detail.doNotCopyNote}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attribution */}
                <div className="rounded-lg border border-border p-4">
                  <h3 className="mb-2 text-sm font-medium">Attribution</h3>
                  <p className="text-sm text-muted-foreground">
                    {detail.attribution.creatorName}
                    {detail.attribution.sourceUrl && (
                      <>
                        {" · "}
                        <a
                          href={detail.attribution.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          View source <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    )}
                  </p>
                </div>

                {/* Similar sections */}
                {detail.similarSections.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-medium">Similar Sections</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {detail.similarSections.map((similar) => (
                        <div
                          key={similar.id}
                          className="overflow-hidden rounded-lg border border-border"
                        >
                          {similar.desktopCropUrl && (
                            <img
                              src={similar.desktopCropUrl}
                              alt={similar.title}
                              className="aspect-video w-full object-cover"
                              loading="lazy"
                            />
                          )}
                          <div className="p-2">
                            <p className="text-xs font-medium line-clamp-1">
                              {similar.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {similar.creatorName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
