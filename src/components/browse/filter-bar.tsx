"use client";

import { useEffect, useRef } from "react";

import {
  FilterSearchRow,
} from "@/components/browse/filter-controls";
import type { FilterControlsProps } from "@/components/browse/filter-controls";

/**
 * Desktop slim sticky bar for /browse.
 *
 * Search + count + sort + clear only — facet chips render in-flow below the
 * header (FacetGroups) so the card grid is never buried behind a slab of
 * pills. Pressing "/" anywhere focuses search, GitHub/Jira style.
 */
export function FilterBar(props: FilterControlsProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="sticky top-16 z-[var(--z-sticky)] -mx-1 rounded-2xl border border-border/70 bg-background/70 px-4 py-2.5 backdrop-blur-xl">
      <FilterSearchRow
        state={props.state}
        resultCount={props.resultCount}
        searchValue={props.searchValue}
        hasActiveFilters={props.hasActiveFilters}
        searchInputRef={searchInputRef}
        onSearchChange={props.onSearchChange}
        onSortChange={props.onSortChange}
        onClearAll={props.onClearAll}
      />
    </div>
  );
}
