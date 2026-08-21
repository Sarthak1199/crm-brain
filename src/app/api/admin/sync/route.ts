import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isRedashConfigured } from "@/lib/redash";
import { isGsheetsConfigured } from "@/lib/gsheets";
import { syncRedashLight } from "@/lib/sync/sync-redash";
import { syncGsheets } from "@/lib/sync/sync-gsheets";

// Deliberately does NOT run syncRedashCreditWeekly here — diagnosed via
// production SyncRun history (Aug 20-21) that this was the actual cause of
// "Sync now" hanging forever: every recent manual sync left two orphaned
// REDASH SyncRun rows (light steps + credit-weekly, run concurrently below)
// with no finishedAt, while the concurrent GSheets leg reliably completed
// in ~170s. The credit-weekly step fetches 14 Redash queries in parallel,
// each independently slow server-side (previously measured ~60s apiece,
// now well past that as merchant count and synced history have grown) —
// it's the one piece of work that pushes past whatever ceiling Vercel
// actually enforces (empirically ~300s in earlier testing, regardless of
// this route's own `maxDuration`), and when the platform kills the
// function mid-flight, the SyncRun row created at the start of
// withSyncRun never reaches the code that sets finishedAt — a genuine,
// silent server-side kill, not a client illusion.
//
// That data doesn't need to be interactive: it's already kept fresh by its
// own daily cron (sync-redash-credit-weekly, see vercel.json), independent
// of this button. Keeping it out of the click path is what makes "Sync
// now" actually finish and report a real result instead of hanging.
export const maxDuration = 240;

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  const [redashLight, gsheets] = await Promise.allSettled([
    isRedashConfigured()
      ? syncRedashLight()
      : Promise.reject(new Error("Not configured (REDASH_BASE_URL / REDASH_API_KEY)")),
    isGsheetsConfigured()
      ? syncGsheets()
      : Promise.reject(new Error("Not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)")),
  ]);

  if (redashLight.status === "fulfilled") results.redashLight = redashLight.value;
  else errors.redashLight = redashLight.reason instanceof Error ? redashLight.reason.message : "Unknown error";

  if (gsheets.status === "fulfilled") results.gsheets = gsheets.value;
  else errors.gsheets = gsheets.reason instanceof Error ? gsheets.reason.message : "Unknown error";

  return NextResponse.json({
    ok: Object.keys(errors).length === 0,
    results,
    errors,
    note: "Credit-consumption-by-week data isn't refreshed by this button — it syncs nightly on its own schedule.",
  });
}
