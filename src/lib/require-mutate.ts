import { auth } from "@/auth";
import { canMutate, type MutationArea } from "./authz";

// The real enforcement boundary for every write server action — UI-level
// hiding of Add/Edit/Delete controls (see authz.ts's canMutate used
// client-side) is just presentation and must never be trusted alone, since
// a Server Action is directly callable regardless of what's rendered.
export async function requireMutate(area: MutationArea = "general") {
  const session = await auth();
  if (!canMutate(session?.user?.role, area)) {
    throw new Error("You don't have permission to make changes here.");
  }
}

// Looser than requireMutate: any signed-in role (including USER) may pass,
// only an actual session is required. Filing a bug/feature request is
// meant to be open to whoever hits the problem, not just Admin/Manager —
// unlike editing or deleting an existing request, which stays Admin/Manager
// only via requireMutate.
export async function requireAuthenticated() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("You must be signed in to do this.");
  }
}

// Stricter than requireMutate: Admin only, no Manager. For actions that
// bulk-write or replace data outright (e.g. the templates CSV/Excel
// import) rather than editing one record at a time.
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Admin access required.");
  }
}
