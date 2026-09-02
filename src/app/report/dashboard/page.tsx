import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeMerchant, serializeSnapshot } from "@/lib/serialize";
import {
  arpu,
  creditBreakupByMid,
  creditConsumptionKpis,
  creditConsumptionTable,
  creditsByMid,
  salesStatus,
  wowCreditTrend,
} from "@/lib/dashboard-data";
import { SalesStatusSection } from "../../(app)/dashboard/charts/sales-status-section";
import { CreditConsumptionKpiSection } from "../../(app)/dashboard/charts/credit-consumption-kpis";
import { CreditConsumptionSection } from "../../(app)/dashboard/charts/credit-consumption-section";

// Server-rendered snapshot of exactly the sections the Mon/Wed/Fri email
// report needs (Sales KPI table + Potential Closure chart + Credit
// Consumption), for a headless browser to screenshot — see
// src/app/api/cron/email-report. Deliberately outside the (app) route
// group so it skips the authenticated sidebar/shell and doesn't require a
// login session; gated by a shared secret instead, same trust boundary as
// every other cron route in this app (see isAuthorized() below).
function isAuthorized(token: string | undefined) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never authorize against an unset secret
  return token === secret;
}

export default async function DashboardReportPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  if (!isAuthorized(params.token)) {
    notFound();
  }

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  // Sales Status intentionally ignores the date range everywhere else in
  // this app (it's an all-time "latest" snapshot) — same here, plus the
  // zero-payment exclusion from the Sales View KPI spec.
  const salesStatusWhere: Prisma.MerchantWhereInput = { paymentCollected: { gt: 0 } };

  const capturedAtFilter: Prisma.DateTimeFilter = {
    gte: from,
    lte: new Date(`${toStr}T23:59:59.999Z`),
  };

  const [creditMerchants, salesStatusMerchants, allTimeCreditSnapshots] = await Promise.all([
    prisma.merchant.findMany({
      where: {
        OR: [{ paymentCollectedDate: null }, { paymentCollectedDate: { gte: from, lte: to } }],
      },
      orderBy: { brandName: "asc" },
      include: {
        snapshots: {
          where: {
            fieldName: {
              in: [
                "creditConsumption.total",
                "creditConsumption.campaigns",
                "creditConsumption.automations",
                "creditConsumption.loyalty",
              ],
            },
            capturedAt: capturedAtFilter,
          },
          orderBy: { capturedAt: "asc" },
        },
      },
    }),
    prisma.merchant.findMany({ where: salesStatusWhere, orderBy: { brandName: "asc" } }),
    // ARPU is all-time, not bound by this report's 7-day window — see the
    // matching comment in dashboard/page.tsx.
    prisma.merchantSnapshot.findMany({
      where: { fieldName: "creditConsumption.total" },
      select: { merchantId: true, value: true },
    }),
  ]);

  const serialized = creditMerchants.map(({ snapshots, ...m }) => ({
    merchant: serializeMerchant(m),
    snapshots: snapshots.map(serializeSnapshot),
  }));
  const mList = serialized.map((r) => r.merchant);
  const salesStatusMList = salesStatusMerchants.map(serializeMerchant);
  const snapshotsByMerchant = Object.fromEntries(serialized.map((r) => [r.merchant.id, r.snapshots]));
  const dateRange = { from: fromStr, to: toStr };

  const allTimeCreditTotalByMerchant: Record<string, number> = {};
  for (const s of allTimeCreditSnapshots) {
    allTimeCreditTotalByMerchant[s.merchantId] =
      (allTimeCreditTotalByMerchant[s.merchantId] ?? 0) + Number(s.value);
  }
  const arpuData = arpu(salesStatusMList, allTimeCreditTotalByMerchant);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div>
          <h1 className="text-[20px] font-bold text-foreground">DotPe CRM — Sales Dashboard</h1>
          <p className="text-[13px] text-muted-foreground">
            {fromStr} to {toStr} (rolling 7 days)
          </p>
        </div>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Sales Status</h2>
          <SalesStatusSection data={salesStatus(salesStatusMList)} merchants={salesStatusMList} />
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Credit Consumption</h2>
          <div className="flex flex-col gap-5">
            <CreditConsumptionKpiSection
              data={creditConsumptionKpis(mList, snapshotsByMerchant, dateRange)}
              arpu={arpuData}
            />
            <CreditConsumptionSection
              byMid={creditsByMid(mList)}
              breakup={creditBreakupByMid(mList, snapshotsByMerchant, dateRange)}
              {...wowCreditTrend(mList, snapshotsByMerchant, dateRange)}
              detailsRows={creditConsumptionTable(mList, snapshotsByMerchant, dateRange)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
