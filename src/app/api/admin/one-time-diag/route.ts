import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "bee008c69f345862de2930edfd931544a67f8924d14a6eab";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const latest = await prisma.merchantSnapshot.findMany({
    where: { fieldName: "creditConsumption.total" },
    orderBy: { capturedAt: "desc" },
    take: 5,
    select: { capturedAt: true, value: true, merchantId: true },
  });

  const count = await prisma.merchantSnapshot.count({
    where: { fieldName: "creditConsumption.total" },
  });

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const inWindow = await prisma.merchantSnapshot.count({
    where: {
      fieldName: "creditConsumption.total",
      capturedAt: { gte: from, lte: to },
    },
  });

  const allFieldNames = await prisma.merchantSnapshot.groupBy({
    by: ["fieldName"],
    _count: true,
    _max: { capturedAt: true },
  });

  const recentRuns = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 15,
    select: { source: true, startedAt: true, finishedAt: true, success: true, error: true },
  });

  return NextResponse.json({
    totalCreditSnapshots: count,
    inLast7Days: inWindow,
    windowFrom: from.toISOString(),
    windowTo: to.toISOString(),
    latest5: latest,
    allFieldsLatestCapture: allFieldNames.map((f) => ({
      field: f.fieldName,
      count: f._count,
      latest: f._max.capturedAt,
    })),
    recentSyncRuns: recentRuns,
  });
}
