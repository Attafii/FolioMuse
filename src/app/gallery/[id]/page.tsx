import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { loadPortfolioDetail } from "@/lib/load-portfolio-detail";
import { PortfolioDetailView } from "@/components/portfolio-detail/portfolio-detail-view";

/**
 * /gallery/[id] - attribution-safe portfolio reference page (ADR-0007).
 *
 * Next 16: `params` is a Promise and MUST be awaited. The loader is wrapped
 * in React `cache()` so generateMetadata and the page share one DB read.
 * Hidden/unknown records call notFound() -> 404 + noindex.
 */

const getDetail = cache((id: string) => loadPortfolioDetail(id));

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetail(id);
  if (!detail) {
    // Never call notFound() here: metadata resolution renders the not-found
    // UI but does not set the HTTP 404 status. Return noindex metadata and
    // let the page's notFound() produce the real 404.
    return { robots: { index: false, follow: false } };
  }
  return {
    title: detail.title,
    description: `Portfolio reference by ${detail.attribution.creatorName} - ${detail.creatorRole}.`,
    robots: { index: true, follow: true },
  };
}

export default async function PortfolioDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getDetail(id);
  if (!detail) {
    notFound();
  }
  return <PortfolioDetailView detail={detail} />;
}
