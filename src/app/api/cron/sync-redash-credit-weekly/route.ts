import { NextRequest, NextResponse } from "next/server";
import { isRedashConfigured } from "@/lib/redash";
import { syncRedashCreditWeekly } from "@/lib/sync/sync-redash";

// Split out from /api/cron/sync-redash so this one slow step (measured
// ~220s even fully parallelized — Redash's own per-query execution time,
// not something client-side concurrency can shrink further) gets a full
// budget to itself instead of competing with the six lighter steps for the
// same ~300s Vercel gateway timeout (confirmed empirically: raising
// `maxDuration` past ~300 didn't change the actual enforced cutoff on this
// plan, so "do less work per request" is the only real fix).
export const maxDuration = 300;

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
    const results = await syncRedashCreditWeekly();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
