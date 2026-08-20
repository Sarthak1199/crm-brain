import { NextRequest, NextResponse } from "next/server";
import { isRedashConfigured } from "@/lib/redash";
import { syncRedash } from "@/lib/sync/sync-redash";

// The full Redash sync (crmAdoption + the 13-call credit-consumption-by-week
// loop + everything else) has measured 5:25-6:54 against production, with
// creditConsumptionByWeek's per-window Redash queries alone taking ~220s
// even at 4x concurrency (each fresh query execution is ~60s server-side on
// Redash's end, not something client-side concurrency alone can fix) — too
// close to a 300s budget to be reliable. 800s is Vercel's ceiling on plans
// with Fluid Compute enabled (Pro+); Hobby hard-caps at 60s regardless of
// this setting, and a Pro plan without Fluid Compute caps at 300s regardless
// — if that's the case here, this value is silently clamped back down and
// the underlying slow-query problem still needs a structural fix (e.g.
// splitting creditConsumptionByWeek into its own cron).
export const maxDuration = 800;

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never authorize against an unset secret
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRedashConfigured()) {
    return NextResponse.json(
      { error: "Redash is not configured (REDASH_BASE_URL / REDASH_API_KEY)" },
      { status: 400 }
    );
  }

  try {
    const results = await syncRedash();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
