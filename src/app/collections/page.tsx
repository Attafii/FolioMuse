import type { Metadata } from "next";

import { CollectionsPage } from "@/components/collections/collections-page";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Collections — FolioMuse",
  description: "Your saved portfolio collections.",
};

export default function CollectionsRoute() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        id="collections-heading"
        eyebrow="Collections"
        title="Your collections"
        description="Group saved portfolios into named collections for easy reference."
      />
      <CollectionsPage />
    </main>
  );
}
