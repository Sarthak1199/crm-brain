import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmailReportData } from "@/lib/report-data";
import { serializeMerchant, serializeSnapshot } from "@/lib/serialize";
import { creditConsumptionKpis } from "@/lib/dashboard-data";
import { latestCompleteWeekRange } from "@/lib/sync/sync-redash";

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

  const emailReportData = await getEmailReportData().catch((e) => ({
    error: e instanceof Error ? e.message : String(e),
  }));

  // Replicates dashboard/page.tsx's default 30D view (no mx filter, no
  // date param — the same fallback the UI applies) with the corrected
  // (unscoped-by-payment) `where`, to directly verify the fix rather than
  // approximating it from raw aggregates above.
  const fromStr30 = thirtyDaysAgo.toISOString().slice(0, 10);
  const toStr30 = now.toISOString().slice(0, 10);
  const dashboardMerchants = await prisma.merchant.findMany({
    where: { OR: [{ paymentCollectedDate: null }, { paymentCollectedDate: { gte: thirtyDaysAgo, lte: now } }] },
    include: {
      snapshots: {
        where: {
          fieldName: { in: ["creditConsumption.total", "creditConsumption.campaigns", "creditConsumption.automations", "creditConsumption.loyalty"] },
          capturedAt: { gte: thirtyDaysAgo, lte: now },
        },
      },
    },
  });
  const dSerialized = dashboardMerchants.map(({ snapshots, ...m }) => ({
    merchant: serializeMerchant(m),
    snapshots: snapshots.map(serializeSnapshot),
  }));
  const dMList = dSerialized.map((r) => r.merchant);
  const dSnapshotsByMerchant = Object.fromEntries(dSerialized.map((r) => [r.merchant.id, r.snapshots]));
  const dashboardCreditKpis = creditConsumptionKpis(dMList, dSnapshotsByMerchant, { from: fromStr30, to: toStr30 });

  // Replicates the "7D" preset (from = now-7d, to = now) with the fixed
  // widened-lower-bound logic from dashboard/page.tsx, to directly verify
  // the exact scenario from the reported screenshot instead of assuming
  // the math checks out.
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const latestWeek7D = latestCompleteWeekRange(now);
  const creditFrom7D = new Date(Math.min(sevenDaysAgo.getTime(), latestWeek7D.start.getTime()));
  const creditFrom7DStr = creditFrom7D.toISOString().slice(0, 10);
  const dashboard7DMerchants = await prisma.merchant.findMany({
    where: { OR: [{ paymentCollectedDate: null }, { paymentCollectedDate: { gte: sevenDaysAgo, lte: now } }] },
    include: {
      snapshots: {
        where: {
          fieldName: { in: ["creditConsumption.total", "creditConsumption.campaigns", "creditConsumption.automations", "creditConsumption.loyalty"] },
          capturedAt: { gte: creditFrom7D, lte: now },
        },
      },
    },
  });
  const d7Serialized = dashboard7DMerchants.map(({ snapshots, ...m }) => ({
    merchant: serializeMerchant(m),
    snapshots: snapshots.map(serializeSnapshot),
  }));
  const d7MList = d7Serialized.map((r) => r.merchant);
  const d7SnapshotsByMerchant = Object.fromEntries(d7Serialized.map((r) => [r.merchant.id, r.snapshots]));
  const dashboard7DCreditKpis = creditConsumptionKpis(d7MList, d7SnapshotsByMerchant, {
    from: creditFrom7DStr,
    to: now.toISOString().slice(0, 10),
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
    emailReportData,
    dashboardCreditKpis,
    dashboard7DCreditKpis,
    creditFrom7DStr,
    recentSyncRuns,
  });
}
