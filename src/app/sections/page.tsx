import type { Metadata } from "next";

import { SectionBrowser } from "@/components/sections/section-browser";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Section Intelligence — FolioMuse",
  description:
    "Browse portfolio section examples organized by type. Learn what makes each section effective with AI-curated lessons.",
};

export default function SectionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        id="sections-heading"
        eyebrow="Section Intelligence"
        title="Learn from the best sections"
        description="Browse portfolio sections by type — hero, projects, about, contact, and more. Each example comes with AI-curated lessons on what makes it effective."
      />
      <SectionBrowser />
    </main>
  );
}
