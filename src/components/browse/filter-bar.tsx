"use client";

import { useEffect, useRef } from "react";

import { FilterControls } from "@/components/browse/filter-controls";
import type { FilterControlsProps } from "@/components/browse/filter-controls";

/**
 * Desktop command/filter bar for /browse (plan T6).
 *
 * - Sticky top bar using the z-index token scale (--z-sticky), hidden below
 *   md (mobile uses FilterSheet).
 * - Command pattern: pressing "/" anywhere (outside inputs/editable areas)
 *   focuses the search input, GitHub/Jira style.
 * - Renders the shared FilterControls with a search-input ref for the
 *   slash shortcut.
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
    <div className="sticky top-0 z-[var(--z-sticky)] hidden border-b border-border bg-background/95 backdrop-blur md:flex">
      <div className="flex w-full flex-col gap-2 py-3">
        <FilterControls {...props} searchInputRef={searchInputRef} />
      </div>
    </div>
  );
}
