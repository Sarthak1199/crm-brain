// Pure, isomorphic RBAC rules — safe to import from client components (for
// hiding/disabling controls) and server code (for the real enforcement
// boundary in requireMutate, see require-mutate.ts). Keep this file free of
// server-only imports (auth(), prisma, etc).

export type AppRole = "ADMIN" | "MANAGER" | "USER";

/** Roadmap is the one area Manager can't write to; everywhere else "general" applies. */
export type MutationArea = "roadmap" | "general";

export function canMutate(role: string | null | undefined, area: MutationArea = "general"): boolean {
  if (role === "ADMIN") return true;
  if (role === "MANAGER") return area === "general";
  return false; // USER, or unauthenticated
}

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  USER: "User",
};
