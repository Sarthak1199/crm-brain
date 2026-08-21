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
