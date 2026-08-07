import { SectionHeader } from "@/components/section-header";

/**
 * Submission criteria (plan T14) — PRESENTATIONAL ONLY.
 *
 * Explains, in honest specific terms grounded in docs/product/curation-rubric.md,
 * how a portfolio item enters the gallery. No forms, no ingestion UI, no links
 * to non-existent submit endpoints. Includes an honest "ingestion coming soon"
 * note — there is no ingestion path yet, so nothing here may overpromise.
 */

const CRITERIA: { title: string; body: string }[] = [
  {
    title: "Quality at or above L2",
    body: "The item must meet the rubric's Adequate level: sections present, descriptions substantive, and a reviewer able to understand the creator's work and voice. L0 and L1 items are below the acceptance threshold.",
  },
  {
    title: "Attribution and consent",
    body: "Creator name, source URL, licence type, and consent date must all be present and non-empty (R3). A consent record must exist granting at least display rights (R4). No fabrication: claims like clients, metrics, or credentials must be traceable through the attribution chain.",
  },
  {
    title: "Originality compliance",
    body: "The item must pass the originality rules (R1-R8): no 1:1 structural cloning of another creator's portfolio, no cross-creator duplication with swapped attribution, and nothing that presents synthesized content as verified real-world claims.",
  },
  {
    title: "Review process",
    body: "Items move PENDING_REVIEW through a compliance check (PASS / FLAG / FAIL) and then a quality score (L0-L4). Items with passing compliance and L2 or above are ACCEPTED; anything else is REJECTED with a documented rationale. Rejected or archived items are never hard-deleted.",
  },
];

export function SubmissionCriteria() {
  return (
    <section
      aria-labelledby="submission-criteria-heading"
      data-testid="submission-criteria"
      className="flex flex-col gap-8"
    >
      <SectionHeader
        id="submission-criteria-heading"
        eyebrow="How it works"
        title="What it takes to be featured"
        description="The honest criteria every portfolio must meet to enter the gallery."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CRITERIA.map((criterion) => (
          <div
            key={criterion.title}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6"
          >
            <h3 className="font-display text-base font-semibold tracking-tight text-card-foreground">
              {criterion.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {criterion.body}
            </p>
          </div>
        ))}
      </div>

      <div
        data-testid="ingestion-note"
        className="flex flex-col gap-1 rounded-2xl border border-dashed border-ring/50 bg-muted/30 p-6"
      >
        <p className="font-display text-sm font-semibold text-card-foreground">
          Ingestion coming soon
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          There is no submission form yet — the gallery is being built from
          editorial samples while the review pipeline is completed. When
          ingestion opens, this section will point to the real path.
        </p>
      </div>
    </section>
  );
}
