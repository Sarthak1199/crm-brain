import { NextRequest, NextResponse } from "next/server";
import { syncGsheets } from "@/lib/sync/sync-gsheets";
import { syncRedashMxGrainWeekly } from "@/lib/sync/sync-redash";
import { prisma } from "@/lib/prisma";

// Temporary, single-use route to populate production with the new
// features' data right after deploy, rather than waiting for tonight's
// cron: ?target=gsheets re-runs the GSheets sync (backfills existing
// RoadmapItem rows onto the new 5-value status via the updated
// syncRoadmap mapping — those rows are fully replaced on every sync, so
// this alone fixes them, no separate migration needed); ?target=mxgrain
// runs the brand-new Redash 11166 sync for the first time (licenses,
// Customers Acquired, transacting branches). Deploy, call each once, then
// delete this file.
export const maxDuration = 280;

const ONE_TIME_TOKEN = "49934a14231e7e0156fab0bdc3e0b04f3a721262f99837e6";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [statusCounts, grainSample, grainCount] = await Promise.all([
    prisma.roadmapItem.groupBy({ by: ["status"], _count: true }),
    prisma.merchant.findFirst({
      where: { grainSyncedAt: { not: null } },
      select: {
        brandName: true,
        ristaStatus: true,
        dotpeStatus: true,
        wabaStatus: true,
        grainHasCrm: true,
        grainHasLoyalty: true,
        grainCustomersAcquired: true,
        grainBranchesTransactingPosL90: true,
      },
      orderBy: { grainCustomersAcquired: "desc" },
    }),
    prisma.merchant.count({ where: { grainSyncedAt: { not: null } } }),
  ]);
  return NextResponse.json({ statusCounts, grainSample, grainCount });
}

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = req.nextUrl.searchParams.get("target");
  try {
    const results = target === "mxgrain" ? await syncRedashMxGrainWeekly() : await syncGsheets();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
