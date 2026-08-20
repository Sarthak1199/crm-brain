import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isRedashConfigured } from "@/lib/redash";
import { isGsheetsConfigured } from "@/lib/gsheets";
import { syncRedash } from "@/lib/sync/sync-redash";
import { syncGsheets } from "@/lib/sync/sync-gsheets";

// Runs both syncs concurrently, not sequentially — they share this one
// request's budget (Redash alone has measured 5:25-6:54 against
// production), so stacking them back-to-back risks a platform timeout that
// kills the function mid-write, leaving a SyncRun row stuck with no
// finishedAt (see getLastSyncStatus's stuckAttempt handling). Running them
// concurrently means the wall-clock cost is whichever one is slower, not
// both added together. 800s is Vercel's ceiling on plans with Fluid Compute
// enabled (Pro+) — see the matching comment on /api/cron/sync-redash for
// why Redash alone needs this much headroom.
export const maxDuration = 800;

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  const [redash, gsheets] = await Promise.allSettled([
    isRedashConfigured()
      ? syncRedash()
      : Promise.reject(new Error("Not configured (REDASH_BASE_URL / REDASH_API_KEY)")),
    isGsheetsConfigured()
      ? syncGsheets()
      : Promise.reject(new Error("Not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)")),
  ]);

  if (redash.status === "fulfilled") results.redash = redash.value;
  else errors.redash = redash.reason instanceof Error ? redash.reason.message : "Unknown error";

  if (gsheets.status === "fulfilled") results.gsheets = gsheets.value;
  else errors.gsheets = gsheets.reason instanceof Error ? gsheets.reason.message : "Unknown error";

  return NextResponse.json({ ok: Object.keys(errors).length === 0, results, errors });
}
