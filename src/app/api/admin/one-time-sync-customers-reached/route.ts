import { NextRequest, NextResponse } from "next/server";
import { syncRedashCustomersReachedWeekly } from "@/lib/sync/sync-redash";

// Temporary, single-use route to trigger the new customersReached.* sync
// once outside the nightly cron (which is gated on CRON_SECRET, not
// available here). Deploy, call once, then delete this file.
export const maxDuration = 280;

const ONE_TIME_TOKEN = "6e775c8f6d8a3ecc6abc6135b3d9f0e7feeb2608e3e29118";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncRedashCustomersReachedWeekly();
  return NextResponse.json({ ok: true, results });
}
