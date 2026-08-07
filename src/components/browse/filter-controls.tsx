"use client";

import { Search, X } from "lucide-react";
import type { Ref } from "react";

import type { BrowseFacets, Facet } from "@/lib/browse/browse-facets";
import type { BrowseState, SortKey } from "@/lib/browse/browse-types";

/**
 * Shared filter controls for the /browse experience (plan T6/T7).
 *
 * ONE definition of the control surface, rendered by both the desktop
 * FilterBar and the mobile FilterSheet so behavior and copy never diverge.
 * Fully controlled: every value comes from props, every mutation is a
 * callback the explorer turns into a URL update.
 *
 * Layout is compact and stacked (search + sort row, then facet groups).
 * Copy register: short, functional, NO em-dashes.
 */

export interface FilterControlsProps {
  state: BrowseState;
  facets: BrowseFacets;
  /** Live filtered result count (shown next to search). */
  resultCount: number;
  /** Controlled search draft (debounced commit lives in the explorer). */
  searchValue: string;
  hasActiveFilters: boolean;
  searchInputRef?: Ref<HTMLInputElement>;
  onSearchChange: (value: string) => void;
  onToggleRole: (value: string) => void;
  onToggleStyle: (value: string) => void;
  onToggleQuality: (value: string) => void;
  onToggleConsent: (value: string) => void;
  onSortChange: (key: SortKey) => void;
  onClearAll: () => void;
}

interface FacetGroupProps {
  label: string;
  facets: Facet[];
  active: string[];
  testId: string;
  onToggle: (value: string) => void;
}

function FacetGroup({ label, facets, active, testId, onToggle }: FacetGroupProps) {
  return (
    <div
      role="group"
      aria-label={`Filter by ${label.toLowerCase()}`}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {facets.map((facet) => {
        const isActive = active.some(
          (v) => v.toLowerCase() === facet.value.toLowerCase(),
        );
        return (
          <button
            key={facet.value}
            type="button"
            data-testid={testId}
            aria-pressed={isActive}
            onClick={() => onToggle(facet.value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-4xl border px-3 text-xs font-medium transition-colors ${
              isActive
                ? "border-ring bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-ring/60 hover:bg-muted"
            }`}
          >
            {facet.value}
            <span
              className={`font-mono ${
                isActive ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {facet.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FilterControls({
  state,
  facets,
  resultCount,
  searchValue,
  hasActiveFilters,
  searchInputRef,
  onSearchChange,
  onToggleRole,
  onToggleStyle,
  onToggleQuality,
  onToggleConsent,
  onSortChange,
  onClearAll,
}: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search + result count + clear all */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <label htmlFor="browse-search" className="sr-only">
            Search portfolios
          </label>
          <input
            ref={searchInputRef}
            id="browse-search"
            data-testid="browse-search"
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search by role, tag, or title"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <p className="font-mono text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? "portfolio" : "portfolios"}
        </p>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearAll}
            data-testid="browse-clear-all"
            className="rounded-md px-2 py-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Facet chip groups (derived from unfiltered corpus) */}
      <div className="flex flex-col gap-2">
        <FacetGroup
          label="Role"
          facets={facets.roles}
          active={state.roles}
          testId="browse-role-chip"
          onToggle={onToggleRole}
        />
        <FacetGroup
          label="Style"
          facets={facets.styles}
          active={state.styles}
          testId="browse-style-chip"
          onToggle={onToggleStyle}
        />
        <FacetGroup
          label="Quality"
          facets={facets.qualities}
          active={state.quality}
          testId="browse-quality-chip"
          onToggle={onToggleQuality}
        />
        <FacetGroup
          label="Consent"
          facets={facets.consents}
          active={state.consent}
          testId="browse-consent-chip"
          onToggle={onToggleConsent}
        />
      </div>

      {/* Sort select */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="browse-sort"
          className="text-sm text-muted-foreground"
        >
          Sort by
        </label>
        <select
          id="browse-sort"
          data-testid="browse-sort"
          value={state.sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="quality">Quality</option>
        </select>
      </div>
    </div>
  );
}
