import type { Metadata } from "next";

import { PortfolioBuilder } from "@/components/portfolio-builder";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Portfolio Builder — FolioMuse",
  description:
    "Build your portfolio with AI assistance. Create sections, get suggestions, and export your portfolio.",
};

export default function BuilderPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        id="builder-heading"
        eyebrow="Builder"
        title="Build your portfolio"
        description="Create sections, get AI suggestions, and export your portfolio as HTML."
      />
      <PortfolioBuilder />
    </main>
  );
}
