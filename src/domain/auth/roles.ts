export type UserRole = "BUILDER" | "EXPLORER" | "AGENT_OPERATOR";

export function hasRole(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role);
}
