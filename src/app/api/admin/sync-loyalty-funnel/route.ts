import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canMutate } from "@/lib/authz";
import { isRedashConfigured } from "@/lib/redash";
import { syncLoyaltyFunnel } from "@/lib/sync/sync-redash";

// A focused counterpart to /api/admin/sync (which deliberately skips slow
// steps) — this hits only the single Redash query behind the Loyalty Setups
// panel (10921), so the panel's own "Sync now" button can return in a few
// seconds instead of waiting on the full multi-source sync.
export async function POST() {
  const session = await auth();
  if (!canMutate(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isRedashConfigured()) {
    return NextResponse.json({ error: "Redash is not configured." }, { status: 503 });
  }

  try {
    const updated = await syncLoyaltyFunnel();
    revalidatePath("/dashboard");
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
