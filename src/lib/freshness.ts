// Freshness label for the portfolio card system (plan portfolio-card-system T6).
//
// Derived from the existing nullable `reviewedAt` - no second persisted
// freshness field (ADR-0006 D4). Returns a compact, copy-register-safe label
// (no em-dashes) or null when the item has never been reviewed.
// Recency buckets follow the curation stale threshold (18 months, ADR-0002 D6).

export function freshnessLabel(reviewedAt: string | null, now: Date = new Date()): string | null {
  if (!reviewedAt) return null;
  const reviewed = new Date(reviewedAt).getTime();
  if (Number.isNaN(reviewed)) return null;

  const days = Math.max(0, Math.floor((now.getTime() - reviewed) / 86_400_000));
  if (days < 1) return "Reviewed today";
  if (days < 7) return "Reviewed this week";
  if (days < 30) return `Reviewed ${days} days ago`;
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `Reviewed ${months} month${months === 1 ? "" : "s"} ago`;
  }
  return "Reviewed over a year ago";
}
