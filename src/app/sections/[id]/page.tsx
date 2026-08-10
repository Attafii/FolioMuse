import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { loadSectionDetail } from "@/lib/load-sections";
import { SectionDetailView } from "@/components/sections/section-detail-view";

/**
 * /sections/[id] - section detail (plan T8, ADR-0008).
 * Next 16: async Promise params, cache() for page + metadata sharing.
 * Hidden/ineligible parent sections call notFound() -> 404 + noindex.
 */

const getDetail = cache((id: string) => loadSectionDetail(id));

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetail(id);
  if (!detail) {
    return { robots: { index: false, follow: false } };
  }
  return {
    title: `${detail.title} - section reference`,
    description: `${detail.sectionType} section pattern by ${detail.creatorName}.`,
    robots: { index: true, follow: true },
  };
}

export default async function SectionDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getDetail(id);
  if (!detail) {
    notFound();
  }
  return <SectionDetailView detail={detail} />;
}
