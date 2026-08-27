"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Ref } from "react";

import type { GalleryFacet, GalleryFacets } from "@/hooks/use-gallery-query";
import { roleChipStyle } from "@/lib/design/roles";
import type { BrowseState, SortKey } from "@/lib/browse/browse-types";

/**
 * Shared filter controls for the /browse experience.
 *
 * Split into two exports so the desktop layout can keep search/sort in a slim
 * sticky bar while facet chips render in-flow (the old all-in-one sticky slab
 * buried the entire card grid under hundreds of style chips).
 *
 * - FacetGroup caps visible chips (default 10) behind a "+N more" expander —
 *   a 2k-item corpus produces hundreds of style tags and an unbounded wall of
 *   pills pushed all content below the fold.
 * - Role chips carry the profession tint system; active state overrides with
 *   the primary treatment.
 * - Fully controlled: every value from props, every mutation a callback.
 * - Copy register: short, functional, NO em-dashes.
 */

export interface FilterControlsProps {
  state: BrowseState;
  facets: GalleryFacets;
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
  facets: GalleryFacet[];
  active: string[];
  testId: string;
  onToggle: (value: string) => void;
  /** Visible chips before the expander (default 10). */
  limit?: number;
  /** Apply profession tints (role group only). */
  tinted?: boolean;
}

function FacetGroup({
  label,
  facets,
  active,
  testId,
  onToggle,
  limit = 10,
  tinted = false,
}: FacetGroupProps) {
  const [expanded, setExpanded] = useState(false);

  // Active selections always stay visible, even beyond the cap.
  const activeValues = facets.filter((f) =>
    active.some((v) => v.toLowerCase() === f.value.toLowerCase()),
  );
  const inactive = facets.filter(
    (f) => !active.some((v) => v.toLowerCase() === f.value.toLowerCase()),
  );
  const visibleInactive = expanded ? inactive : inactive.slice(0, limit);
  const hidden = inactive.length - Math.min(inactive.length, limit);

  return (
    <div
      role="group"
      aria-label={`Filter by ${label.toLowerCase()}`}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {activeValues.map((facet) => (
        <FacetChip
          key={facet.value}
          facet={facet}
          testId={testId}
          active
          tinted={tinted}
          onToggle={onToggle}
        />
      ))}
      {visibleInactive.map((facet) => (
        <FacetChip
          key={facet.value}
          facet={facet}
          testId={testId}
          active={false}
          tinted={tinted}
          onToggle={onToggle}
        />
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex h-8 items-center rounded-4xl border border-dashed border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground"
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      ) : null}
    </div>
  );
}

function FacetChip({
  facet,
  testId,
  active,
  tinted,
  onToggle,
}: {
  facet: GalleryFacet;
  testId: string;
  active: boolean;
  tinted: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onClick={() => onToggle(facet.value)}
      style={tinted && !active ? roleChipStyle(facet.value) : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-4xl border px-3 text-xs font-medium transition-colors ${
        active
          ? "border-ring bg-primary text-primary-foreground"
          : tinted
            ? "border-transparent hover:brightness-95 dark:hover:brightness-110"
            : "border-border bg-card text-foreground hover:border-ring/60 hover:bg-muted"
      }`}
    >
      {facet.value}
      <span
        className={`font-mono ${
          active ? "text-primary-foreground/80" : "text-muted-foreground"
        }`}
      >
        {facet.count}
      </span>
    </button>
  );
}

/** Search + count + sort + clear — the slim sticky row. */
export function FilterSearchRow({
  state,
  resultCount,
  searchValue,
  hasActiveFilters,
  searchInputRef,
  onSearchChange,
  onSortChange,
  onClearAll,
}: Pick<
  FilterControlsProps,
  | "state"
  | "resultCount"
  | "searchValue"
  | "hasActiveFilters"
  | "searchInputRef"
  | "onSearchChange"
  | "onSortChange"
  | "onClearAll"
>) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex min-w-56 flex-1 items-center gap-2 rounded-full border border-input bg-card/80 px-4 backdrop-blur focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
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
          placeholder="Search portfolios"
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

      <p
        data-testid="browse-count-inline"
        className="font-mono text-sm text-muted-foreground"
      >
        {resultCount.toLocaleString()} {resultCount === 1 ? "portfolio" : "portfolios"}
      </p>

      <label htmlFor="browse-sort" className="sr-only">
        Sort by
      </label>
      <select
        id="browse-sort"
        data-testid="browse-sort"
        value={state.sort}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        className="h-10 rounded-full border border-border bg-card/80 px-4 text-sm text-foreground backdrop-blur transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
      >
        <option value="newest">Newest</option>
        <option value="title-asc">Title A-Z</option>
        <option value="title-desc">Title Z-A</option>
        <option value="quality">Stars</option>
      </select>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClearAll}
          data-testid="browse-clear-all"
          className="rounded-full px-3 py-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

/** Facet chip groups — render in-flow, capped, role-tinted. */
export function FacetGroups({
  state,
  facets,
  onToggleRole,
  onToggleStyle,
  onToggleQuality,
  onToggleConsent,
}: Pick<
  FilterControlsProps,
  "state" | "facets" | "onToggleRole" | "onToggleStyle" | "onToggleQuality" | "onToggleConsent"
>) {
  return (
    <div className="flex flex-col gap-3">
      <FacetGroup
        label="Role"
        facets={facets.roles}
        active={state.roles}
        testId="browse-role-chip"
        onToggle={onToggleRole}
        limit={12}
        tinted
      />
      <FacetGroup
        label="Style"
        facets={facets.styles}
        active={state.styles}
        testId="browse-style-chip"
        onToggle={onToggleStyle}
        limit={12}
      />
      <FacetGroup
        label="Stars"
        facets={facets.qualities}
        active={state.quality}
        testId="browse-quality-chip"
        onToggle={onToggleQuality}
        limit={6}
      />
      <FacetGroup
        label="Consent"
        facets={facets.consents}
        active={state.consent}
        testId="browse-consent-chip"
        onToggle={onToggleConsent}
        limit={6}
      />
    </div>
  );
}

/** Full stack for surfaces that want everything in one block (mobile sheet). */
export function FilterControls(props: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      <FilterSearchRow
        state={props.state}
        resultCount={props.resultCount}
        searchValue={props.searchValue}
        hasActiveFilters={props.hasActiveFilters}
        searchInputRef={props.searchInputRef}
        onSearchChange={props.onSearchChange}
        onSortChange={props.onSortChange}
        onClearAll={props.onClearAll}
      />
      <FacetGroups
        state={props.state}
        facets={props.facets}
        onToggleRole={props.onToggleRole}
        onToggleStyle={props.onToggleStyle}
        onToggleQuality={props.onToggleQuality}
        onToggleConsent={props.onToggleConsent}
      />
    </div>
  );
}
