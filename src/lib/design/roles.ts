/**
 * Profession → tint-token mapping.
 *
 * Every role renders from named CSS custom properties defined in
 * globals.css (:root / .dark) — never inline color literals (hallmark
 * locked-tokens rule). Unknown roles degrade to the neutral generic pair.
 */

export interface RoleTint {
  /** CSS var name suffix, e.g. "aiml" -> var(--role-aiml-bg/fg). */
  token: string;
}

const TOKEN_BY_ROLE: Record<string, string> = {
  Designer: "designer",
  Frontend: "frontend",
  Backend: "backend",
  "Full Stack": "full-stack",
  "AI/ML": "aiml",
  Mobile: "mobile",
  DevOps: "devops",
  Data: "data",
  "Game Dev": "game-dev",
  Security: "security",
  Photographer: "photographer",
  Architect: "architect",
  "Mechanical Engineer": "mechanical-engineer",
  Finance: "finance",
  Marketer: "marketer",
  Embedded: "embedded",
  Developer: "developer",
};

export function roleTint(role: string): RoleTint {
  return { token: TOKEN_BY_ROLE[role] ?? "generic" };
}

/** Inline style referencing the named tokens (no literal colors). */
export function roleChipStyle(role: string): React.CSSProperties {
  const { token } = roleTint(role);
  return {
    backgroundColor: `var(--role-${token}-bg)`,
    color: `var(--role-${token}-fg)`,
  };
}
