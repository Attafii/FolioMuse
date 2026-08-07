"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGallerySummaries } from "@/hooks/use-gallery-summaries";
import { useTelemetry } from "@/hooks/use-telemetry";
import type { GalleryItemSummary } from "@/domain/curation/types";

/**
 * Hero + direct search (plan T8).
 *
 * - One <h1> with the value proposition (tightened from layout metadata).
 * - Client-side filter over summaries fetched via useGallerySummaries:
 *   case-insensitive substring match on title / creatorRole / styleTags.
 * - Empty query shows all items. No-results shows "No portfolios match" + reset.
 * - Keyboard: Tab reaches the input, ArrowUp/ArrowDown navigate the result
 *   list, Enter opens the highlighted result, Escape closes the panel.
 * - Loading shows real skeleton cards; error shows a retry action.
 * - No autocomplete library, no debounce lib, no ranking (zero deps).
 * - Telemetry (plan T17): on submit/Enter each surfaced result gets an
 *   IMPRESSION (payload carries the query — a pattern signal); opening a
 *   result (Enter on highlighted / click) fires OPEN. Privacy: hashed
 *   subject key, no page-view events (ADR-0004 non-metrics).
 */

function matchesQuery(item: GalleryItemSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.title.toLowerCase().includes(q)) return true;
  if (item.creatorRole.toLowerCase().includes(q)) return true;
  return item.styleTags.some((tag) => tag.toLowerCase().includes(q));
}

function ResultCard({
  item,
  active,
  onMouseEnter,
  onOpen,
}: {
  item: GalleryItemSummary;
  active: boolean;
  onMouseEnter: () => void;
  onOpen: () => void;
}) {
  return (
    <a
      href={item.attribution.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={onMouseEnter}
      onClick={onOpen}
      className={`flex flex-col gap-2 rounded-md border p-4 transition-colors ${
        active
          ? "border-ring bg-accent"
          : "border-border bg-card hover:border-ring/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-display font-medium text-card-foreground">
          {item.title}
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {item.creatorRole}
        </span>
      </div>
      {item.styleTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {item.styleTags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="font-mono text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </a>
  );
}

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-md border border-border bg-muted/60"
        />
      ))}
    </div>
  );
}

export function SearchHero() {
  const { items, loading, error, refetch } = useGallerySummaries();
  const { impression, open } = useTelemetry();
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  );

  const hasResults = results.length > 0;
  const showPanel =
    panelOpen && !loading && !error && (query.trim() !== "" || items.length > 0);

  // Telemetry (plan T17): search_submit → IMPRESSION per surfaced result.
  // Query string is a pattern signal (allowed per ADR-0004); per-interaction
  // idempotency key so every submit records. Never blocks UI (fire-and-forget).
  function reportSubmit() {
    const q = query.trim();
    if (!q) return;
    for (const result of results) {
      impression(result.id, { source: "search", query: q });
    }
  }

  // OPEN on result open (keyboard Enter on highlighted result).
  function reportOpen(item: GalleryItemSummary) {
    const q = query.trim();
    open(item.id, q ? { source: "search", query: q } : { source: "search" });
  }

  function openPanel() {
    setPanelOpen(true);
    setActiveIndex(-1);
  }

  function closePanel() {
    setPanelOpen(false);
    setActiveIndex(-1);
  }

  function reset() {
    setQuery("");
    setActiveIndex(-1);
    openPanel();
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      // preventDefault stops the native type="search" clear behavior,
      // which would fire onChange -> openPanel() and reopen the panel.
      e.preventDefault();
      closePanel();
      return;
    }
    if (!showPanel) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPanelOpen(true);
      setActiveIndex((i) => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        i <= 0 ? Math.max(results.length - 1, 0) : i - 1,
      );
    } else if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      const target = results[activeIndex];
      reportOpen(target);
      window.open(target.attribution.sourceUrl, "_blank", "noopener,noreferrer");
      closePanel();
    }
  }

  function handleResultMouseEnter(index: number) {
    setActiveIndex(index);
  }

  return (
    <section
      aria-labelledby="masthead-heading"
      data-testid="masthead"
      className="flex flex-col gap-8 py-12 sm:py-16"
    >
      <div className="flex max-w-3xl flex-col gap-4">
        <p className="font-mono text-sm text-muted-foreground">FolioMuse</p>
        <h1
          id="masthead-heading"
          className="font-display text-4xl font-semibold tracking-tighter sm:text-5xl lg:text-6xl"
        >
          Build a portfolio that is genuinely your own.
        </h1>
        <p className="max-w-[65ch] text-lg leading-relaxed text-muted-foreground">
          Informed by real examples, sharpened by AI feedback, assembled with
          an agent.
        </p>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="relative flex w-full max-w-2xl flex-col gap-2">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            reportSubmit();
          }}
          className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
        >
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <label htmlFor="search-input" className="sr-only">
            Search portfolios
          </label>
          <input
            ref={inputRef}
            id="search-input"
            data-testid="search-input"
            type="search"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search by role, tag, or title"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              openPanel();
              setActiveIndex(-1);
            }}
            onFocus={openPanel}
            onKeyDown={handleKeyDown}
            aria-expanded={showPanel}
            aria-controls="search-results"
            aria-activedescendant={
              activeIndex >= 0 ? `result-${results[activeIndex]?.id}` : undefined
            }
            className="h-12 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={reset}
              aria-label="Clear search"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          ) : null}
        </form>

        {/* ── Loading skeletons ─────────────────────────────────────────── */}
        {loading ? (
          <div
            id="search-results"
            data-testid="search-results"
            className="flex flex-col gap-3 rounded-lg border border-border bg-popover p-4"
          >
            <SkeletonCards />
          </div>
        ) : null}

        {/* ── Error state ───────────────────────────────────────────────── */}
        {!loading && error ? (
          <div
            id="search-results"
            data-testid="search-results"
            className="flex flex-col items-start gap-3 rounded-lg border border-border bg-popover p-4"
          >
            <p className="text-sm text-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Try again
            </Button>
          </div>
        ) : null}

        {/* ── Results panel ─────────────────────────────────────────────── */}
        {showPanel ? (
          <div
            ref={resultsRef}
            id="search-results"
            data-testid="search-results"
            role="listbox"
            aria-label="Search results"
            className="absolute top-full z-[var(--z-overlay)] mt-2 flex max-h-96 w-full flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-popover p-4 shadow-lg"
          >
            {hasResults ? (
              results.map((item, index) => (
                <div
                  key={item.id}
                  id={`result-${item.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <ResultCard
                    item={item}
                    active={index === activeIndex}
                    onMouseEnter={() => handleResultMouseEnter(index)}
                    onOpen={() => reportOpen(item)}
                  />
                </div>
              ))
            ) : (
              <div className="flex flex-col gap-2 p-2">
                <p className="font-display font-medium text-card-foreground">
                  No portfolios match
                </p>
                <p className="text-sm text-muted-foreground">
                  Try a different role, tag, or title.
                </p>
                <Button variant="outline" size="sm" onClick={reset}>
                  Clear search
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {/* ── Empty gallery (no data at all) ────────────────────────────── */}
        {!loading && !error && items.length === 0 && !panelOpen ? (
          <div
            data-testid="search-results"
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6"
          >
            <p className="font-display text-lg font-medium text-card-foreground">
              No accepted portfolios yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Be the first. The gallery fills after the first curation review.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
