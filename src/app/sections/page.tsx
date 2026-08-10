import type { Metadata } from "next";

import { SECTION_TYPES } from "@/domain/curation/section-schemas";
import { loadSectionCards } from "@/lib/load-sections";
import { SectionLibraryView } from "@/components/sections/section-library-view";

/**
 * /sections - section pattern library (plan T8, ADR-0008).
 * Server component: loads strict-safe section cards + the closed taxonomy,
 * then renders the client library view (cards + filters + collection).
 */

export const metadata: Metadata = {
  title: "Section library",
  description: "Browse reusable portfolio section patterns: heroes, project grids, timelines, contact CTAs, and more.",
  robots: { index: true, follow: true },
};

export default async function SectionsPage() {
  const cards = await loadSectionCards();
  return <SectionLibraryView cards={cards} taxonomy={[...SECTION_TYPES]} />;
}
