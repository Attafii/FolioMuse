import type { Metadata } from "next";

import { ComparePage } from "@/components/compare/compare-page";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Compare Portfolios — FolioMuse",
  description: "Compare portfolios side-by-side.",
};

export default function CompareRoute() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        id="compare-heading"
        eyebrow="Compare"
        title="Compare portfolios"
        description="View portfolios side-by-side to compare design, structure, and style."
      />
      <ComparePage />
    </main>
  );
}
