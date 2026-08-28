import type { Metadata } from "next";

import { SubmissionForm } from "@/components/submission-form";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Submit Portfolio — FolioMuse",
  description: "Submit a portfolio to the FolioMuse gallery for review.",
};

export default function BuilderPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        id="submit-heading"
        eyebrow="Contribute"
        title="Submit a portfolio"
        description="Know a great portfolio? Submit it for review and it might be featured in our gallery."
      />
      <SubmissionForm />
    </main>
  );
}
