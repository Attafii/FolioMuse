import type { Metadata } from "next";
import { ClaimRemovalControls } from "@/components/portfolio-detail/claim-removal-controls";

export const metadata: Metadata = {
  title: "Builder",
  description: "Submit or claim a portfolio.",
};

export default function BuilderPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Builder</h1>
      <p className="mt-2 text-muted-foreground">Submit or claim a portfolio.</p>
      <div className="mt-8">
        <ClaimRemovalControls itemId="test-item" />
      </div>
    </main>
  );
}
