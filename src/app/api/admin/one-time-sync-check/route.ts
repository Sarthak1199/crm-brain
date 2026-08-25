import { NextRequest, NextResponse } from "next/server";
import { getLastSyncStatus } from "@/lib/sync/sync-run";
import { syncGsheets } from "@/lib/sync/sync-gsheets";
import { syncRedashLight } from "@/lib/sync/sync-redash";
import { prisma } from "@/lib/prisma";

// Temporary, single-use route to diagnose + verify the fix for the stale
// GSheets sync / hanging Sync now button. GET is read-only (sync status +
// current Total Collected). POST triggers a fresh syncGsheets() or
// syncRedashLight() run (pass ?target=redash to run that instead of the
// default gsheets). Deploy, use a few times, then delete this file.
export const maxDuration = 280;

const ONE_TIME_TOKEN = "2575b103881ea73e9e40089118867592d86e3dda2797e3cf";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = await getLastSyncStatus();
  const totalCollected = await prisma.merchant.aggregate({ _sum: { paymentCollected: true } });
  return NextResponse.json({ status, totalCollectedAllTime: totalCollected._sum.paymentCollected });
}

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const target = req.nextUrl.searchParams.get("target");
  try {
    const results = target === "redash" ? await syncRedashLight() : await syncGsheets();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
