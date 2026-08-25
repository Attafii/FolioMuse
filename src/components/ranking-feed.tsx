import type { RankingResult } from "@/domain/flywheel/types";

export function RankingFeed({ results }: { results: RankingResult[] }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <h2 className="font-display text-2xl font-semibold tracking-tight">Ranking Feed</h2>
      <ul className="mt-6 flex flex-col gap-4">
        {results.map((r) => (
          <li key={r.itemId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-display font-medium">{r.itemId}</span>
              <span className="font-mono text-xs text-muted-foreground">Score: {r.finalRankScore.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {r.explanationReasonCode}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
