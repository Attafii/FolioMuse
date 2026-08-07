"use client";

import { FilterExplorer } from "@/components/filter-explorer";
import type { GalleryItemSummary } from "@/domain/curation/types";

/**
 * Role explorer (plan T10).
 *
 * Derives distinct creatorRole values from fetched summaries and renders them
 * as filterable chips with real counts. Clicking a chip filters the gallery
 * cards to that role (client state only, no routing). Roles are NEVER
 * hardcoded — derived from data.
 */
export function RoleExplorer() {
  return (
    <FilterExplorer
      id="role-explorer-heading"
      testid="role-explorer"
      eyebrow="By role"
      title="Explore portfolios by role"
      description="Product designers, developers, illustrators, and more."
      getValues={(item: GalleryItemSummary) => [item.creatorRole]}
      chipTestId="role-chip"
      countTestId="role-chip-count"
    />
  );
}
