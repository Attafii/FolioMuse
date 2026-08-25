"use client";

import { FilterExplorer } from "@/components/filter-explorer";

/**
 * Section explorer (plan T11).
 *
 * Analogous to the role explorer but for portfolio structure: chips come from
 * server-computed styleTag facet counts; clicking filters via the server.
 * Tags are NEVER a fabricated taxonomy — derived from data. styleTags are the
 * proxy for "sections" until real section intelligence exists (R2
 * aggregation constraints apply to that later feature, not here).
 */
export function SectionExplorer() {
  return (
    <FilterExplorer
      id="section-explorer-heading"
      testid="section-explorer"
      title="Browse by portfolio section"
      description="Jump straight to the part of a portfolio you want to study."
      facetGroup="styles"
      chipTestId="tag-chip"
      countTestId="tag-chip-count"
      telemetrySource="section_explorer"
    />
  );
}
