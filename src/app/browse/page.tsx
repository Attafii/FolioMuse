import type { Metadata } from "next";
import { Suspense } from "react";

import { BrowseExplorer } from "@/components/browse/browse-explorer";
import { BrowseSkeleton } from "@/components/browse/browse-states";

/**
 * /browse route (plan T9).
 *
 * Server component shell: metadata + a Suspense boundary around the client
 * BrowseExplorer. Per Next 16, a statically prerendered page whose client
 * tree calls useSearchParams MUST wrap it in <Suspense> or the build fails
 * with "Missing Suspense boundary with useSearchParams". The fallback is the
 * skeleton grid, so initial HTML is prerendered while the client component
 * hydrates and reads the URL.
 *
 * No server-side fetch, no direct Prisma (plan T9 MUST NOT).
 */

export const metadata: Metadata = {
  title: "Browse portfolios",
  description:
    "Filter and sort the gallery by role, style, quality, and consent. Share any view by copying the URL.",
};

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowseExplorer />
    </Suspense>
  );
}
