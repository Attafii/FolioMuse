import type { Metadata } from "next";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Analytics — FolioMuse",
  description: "Portfolio analytics and insights.",
};

export default function AnalyticsRoute() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        id="analytics-heading"
        eyebrow="Analytics"
        title="Portfolio analytics"
        description="View insights about portfolio views, saves, and engagement."
      />
      <AnalyticsDashboard />
    </main>
  );
}
