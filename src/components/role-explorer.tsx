"use client";

import { FilterExplorer } from "@/components/filter-explorer";

/**
 * Role explorer (plan T10).
 *
 * Chips come from server-computed role facet counts (/api/gallery/facets);
 * clicking one issues a small server-filtered page. Roles are NEVER
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
      facetGroup="roles"
      chipTestId="role-chip"
      countTestId="role-chip-count"
      telemetrySource="role_explorer"
    />
  );
}
