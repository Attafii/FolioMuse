import { redirect } from "next/navigation";

import {
  GalleryRepositoryPrisma,
  AuditRepositoryPrisma,
} from "@/persistence/gallery-repository-prisma";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import { CurationServiceImpl } from "@/domain/curation/curation-service";
import type { ProvenanceRebuildQueue } from "@/domain/provenance/ports";

/**
 * /random — redirects to a random accepted portfolio.
 *
 * Server component: uses CurationService (same as /api/gallery/summaries)
 * to fetch accepted items, then picks one at random and redirects.
 * Falls back to /browse ONLY when the gallery is genuinely empty.
 */

const galleryRepo = new GalleryRepositoryPrisma();
const auditRepo = new AuditRepositoryPrisma();
const provenanceRepo = new ProvenanceRepositoryPrisma();
const rebuildQueue: ProvenanceRebuildQueue = { enqueueRebuild: async () => {} };

const curationService = new CurationServiceImpl(
  galleryRepo,
  auditRepo,
  provenanceRepo,
  rebuildQueue,
);

export default async function RandomPage() {
  // Fetch all accepted items using the same service as the gallery API.
  // pageSize=100 is the max; if there are more, we pick from the first 100.
  const { items, total } = await curationService.listAcceptedFiltered({
    q: "",
    sort: "newest",
    page: 1,
    pageSize: 100,
  });

  if (total === 0 || items.length === 0) {
    redirect("/browse");
  }

  // Pick a random item from the results
  const randomIndex = Math.floor(Math.random() * items.length);
  const item = items[randomIndex];

  redirect(`/gallery/${item.id}`);
}
