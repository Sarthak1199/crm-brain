import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "66fa57666165aeb95af635d883daa8aca83db017a8d56744";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const byWeek = await prisma.merchantSnapshot.groupBy({
    by: ["capturedAt"],
    where: { fieldName: "creditConsumption.total" },
    _sum: { value: true },
    _count: true,
    orderBy: { capturedAt: "desc" },
    take: 15,
  });

  const rolling30 = await prisma.merchantSnapshot.aggregate({
    where: {
      fieldName: "creditConsumption.total",
      capturedAt: { gte: thirtyDaysAgo, lte: now },
    },
    _sum: { value: true },
    _count: true,
  });

  const merchantCount = await prisma.merchant.count();
  const payingMerchantCount = await prisma.merchant.count({ where: { paymentCollected: { gt: 0 } } });

  const payingMerchantIds = (
    await prisma.merchant.findMany({ where: { paymentCollected: { gt: 0 } }, select: { id: true } })
  ).map((m) => m.id);

  const rolling30Paying = await prisma.merchantSnapshot.aggregate({
    where: {
      fieldName: "creditConsumption.total",
      capturedAt: { gte: thirtyDaysAgo, lte: now },
      merchantId: { in: payingMerchantIds },
    },
    _sum: { value: true },
    _count: true,
  });

  const recentSyncRuns = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
    select: { source: true, startedAt: true, finishedAt: true, success: true, error: true },
  });

  return NextResponse.json({
    serverNow: now.toISOString(),
    thirtyDaysAgo: thirtyDaysAgo.toISOString(),
    merchantCount,
    payingMerchantCount,
    byWeek,
    rolling30,
    rolling30Paying,
    recentSyncRuns,
  });
}
