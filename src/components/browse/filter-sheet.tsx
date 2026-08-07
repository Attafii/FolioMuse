"use client";

import { useState } from "react";

import { FilterControls } from "@/components/browse/filter-controls";
import type { FilterControlsProps } from "@/components/browse/filter-controls";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DEFAULT_BROWSE_STATE } from "@/lib/browse/browse-types";

/**
 * Mobile filter bottom sheet for /browse (plan T7).
 *
 * - Trigger button visible below md only (desktop uses FilterBar).
 * - Radix/Base UI Sheet with side="bottom": focus trap, ESC close,
 *   aria-modal, and trigger refocus come from the primitive - never
 *   reimplemented here.
 * - Body is max-h-[85dvh] + overflow-y-auto (no h-screen viewport lock),
 *   with iOS safe-area bottom padding.
 * - Renders the SAME shared FilterControls as the desktop bar, so control
 *   definitions and copy never diverge (zero duplication, plan T7).
 * - Active-count badge counts constrained filter groups (q, roles, styles,
 *   qualities, consents, sort) - resets to 0 via clearAll.
 */

function countActiveGroups(state: FilterControlsProps["state"]): number {
  let count = 0;
  if (state.q) count += 1;
  if (state.roles.length) count += 1;
  if (state.styles.length) count += 1;
  if (state.quality.length) count += 1;
  if (state.consent.length) count += 1;
  if (state.sort !== DEFAULT_BROWSE_STATE.sort) count += 1;
  return count;
}

export function FilterSheet(props: FilterControlsProps) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveGroups(props.state);

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              data-testid="browse-sheet-trigger"
            />
          }
        >
          Filters
          {activeCount > 0 ? (
            <span
              data-testid="browse-sheet-badge"
              className="font-mono text-muted-foreground"
            >
              {activeCount}
            </span>
          ) : null}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          data-testid="browse-sheet"
          aria-label="Browse filters"
          className="p-0"
        >
          <SheetHeader className="p-4 pb-0">
            <SheetTitle className="font-display text-lg font-semibold tracking-tight">
              Browse filters
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[85dvh] overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <FilterControls {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
