import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isRedashConfigured } from "@/lib/redash";
import { isGsheetsConfigured } from "@/lib/gsheets";
import { syncRedashLight, syncRedashCreditWeekly } from "@/lib/sync/sync-redash";
import { syncGsheets } from "@/lib/sync/sync-gsheets";

// Runs all three syncs concurrently rather than sequentially, and splits
// Redash into its light/heavy halves the same way the daily cron does (see
// sync-redash.ts) — confirmed empirically against production that this
// account's Vercel plan enforces roughly a 300s gateway timeout regardless
// of this route's `maxDuration` value (tested up to 800, no change in the
// actual cutoff), and the full 7-step Redash sync alone measured 5:25-6:54.
// Running the light steps, the one slow step, and GSheets concurrently
// bounds the wall-clock cost to whichever is slowest (~220s for the slow
// step) instead of stacking everything under one shared budget.
export const maxDuration = 300;

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  const [redashLight, redashCreditWeekly, gsheets] = await Promise.allSettled([
    isRedashConfigured()
      ? syncRedashLight()
      : Promise.reject(new Error("Not configured (REDASH_BASE_URL / REDASH_API_KEY)")),
    isRedashConfigured()
      ? syncRedashCreditWeekly()
      : Promise.reject(new Error("Not configured (REDASH_BASE_URL / REDASH_API_KEY)")),
    isGsheetsConfigured()
      ? syncGsheets()
      : Promise.reject(new Error("Not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)")),
  ]);

  if (redashLight.status === "fulfilled") results.redashLight = redashLight.value;
  else errors.redashLight = redashLight.reason instanceof Error ? redashLight.reason.message : "Unknown error";

  if (redashCreditWeekly.status === "fulfilled") results.redashCreditWeekly = redashCreditWeekly.value;
  else
    errors.redashCreditWeekly =
      redashCreditWeekly.reason instanceof Error ? redashCreditWeekly.reason.message : "Unknown error";

  if (gsheets.status === "fulfilled") results.gsheets = gsheets.value;
  else errors.gsheets = gsheets.reason instanceof Error ? gsheets.reason.message : "Unknown error";

  return NextResponse.json({ ok: Object.keys(errors).length === 0, results, errors });
}
