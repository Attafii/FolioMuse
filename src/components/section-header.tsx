import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Heading id — the owning <section> wires aria-labelledby to this. */
  id: string;
  /**
   * Optional small-caps label. RESTRAINT (Taste Skill §4.7): max 1 eyebrow
   * per 3 sections — most sections omit this entirely.
   */
  eyebrow?: string;
  /** Section title — always rendered as an <h2>. */
  title: string;
  /** Optional supporting paragraph (max 65ch). */
  description?: string;
  className?: string;
}

/**
 * Shared section heading primitive (plan T7). One file, one concern.
 * Every homepage section uses this so heading hierarchy, typography scale,
 * and spacing stay consistent across the page. Server component — no state.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  description,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {eyebrow ? (
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="max-w-[65ch] text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
