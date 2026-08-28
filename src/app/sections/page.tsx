import type { Metadata } from "next";

import { SectionGuideBrowser } from "@/components/sections/section-guide-browser";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Section Intelligence — FolioMuse",
  description:
    "Best practices, AI prompts, and examples for building effective portfolio sections. Hero, about, projects, contact, and more.",
};

export default function SectionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        id="sections-heading"
        eyebrow="Section Intelligence"
        title="Build sections that work"
        description="Best practices, ready-to-use AI prompts, and pro tips for every portfolio section. Copy a prompt, paste it into the Builder, and let AI do the rest."
      />
      <SectionGuideBrowser />
    </main>
  );
}
