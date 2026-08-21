import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary, single-use read-only route to inspect production SyncRun
// history while diagnosing the "sync stuck loading" report — deploy, call
// once, then delete. Token generated fresh for this purpose only.
export const maxDuration = 30;

const ONE_TIME_TOKEN = "128dcad4a778256f69df0bf488586010cc908fa5a0837920";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runs = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    select: {
      id: true,
      source: true,
      startedAt: true,
      finishedAt: true,
      success: true,
      error: true,
      summary: true,
    },
  });

  const withDurations = runs.map((r) => ({
    ...r,
    durationSec: r.finishedAt
      ? Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000)
      : null,
    stillOpenAfterSec: r.finishedAt ? null : Math.round((Date.now() - r.startedAt.getTime()) / 1000),
  }));

  const [merchantCount, snapshotCount] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchantSnapshot.count(),
  ]);

  return NextResponse.json({ runs: withDurations, merchantCount, snapshotCount });
}
