import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GalleryItemSummary, QualityLevel } from "@/domain/curation/types";

/**
 * Shared constant for editorial-sample labeling (plan T9).
 * All seeded items are labeled editorial samples (scripts/seed-gallery.ts).
 * Kept as a title-prefix matcher so no fake/sample data ever masquerades as
 * a real, verified portfolio.
 */
export const EDITORIAL_SAMPLE_PREFIX = "Editorial Sample";

export function isEditorialSample(item: GalleryItemSummary): boolean {
  return item.title.startsWith(EDITORIAL_SAMPLE_PREFIX);
}

const QUALITY_LEVEL_LABELS: Record<QualityLevel, string> = {
  L0: "L0 · Unusable",
  L1: "L1 · Minimal",
  L2: "L2 · Adequate",
  L3: "L3 · Strong",
  L4: "L4 · Exemplary",
};

function QualityBadge({ level }: { level: QualityLevel }) {
  const variant =
    level === "L4"
      ? ("success" as const)
      : level === "L3"
        ? ("info" as const)
        : level === "L2"
          ? ("secondary" as const)
          : ("outline" as const);
  return (
    <Badge
      variant={variant}
      data-testid="quality-badge"
      title={QUALITY_LEVEL_LABELS[level]}
    >
      {QUALITY_LEVEL_LABELS[level]}
    </Badge>
  );
}

/**
 * Reusable gallery card (plan T9). Summaries only — NEVER renders
 * contentBlob/structureJSON (originality rules R3/R5).
 *
 * - Whole card links to attribution.sourceUrl in a new tab (external).
 *   NO internal detail pages exist.
 * - Shows: title, creatorRole, styleTags (badges), qualityLevel badge,
 *   attribution line (creatorName + external source link), and an
 *   "Editorial sample" badge when applicable.
 */
export function GalleryCard({ item }: { item: GalleryItemSummary }) {
  const isSample = isEditorialSample(item);

  return (
    <Card
      data-testid="gallery-card"
      size="default"
      variant="hover"
      className="group/card"
    >
      <a
        href={item.attribution.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.title} by ${item.attribution.creatorName} (opens in new tab)`}
        className="flex h-full flex-col"
      >
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <p className="text-sm text-muted-foreground">{item.creatorRole}</p>
          {item.styleTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.styleTags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="secondary" className="font-mono text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <QualityBadge level={item.qualityLevel} />
          {isSample ? (
            <Badge
              variant="outline"
              data-testid="editorial-sample-badge"
              className="font-mono text-xs"
            >
              Editorial sample
            </Badge>
          ) : null}
        </CardFooter>
      </a>
    </Card>
  );
}
