import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeMerchant, serializeSnapshot } from "@/lib/serialize";
import {
  salesStatus,
  potentialClosureSummary,
  creditConsumptionKpis,
  arpu,
  adoptionStats,
  customersReachedTable,
} from "@/lib/dashboard-data";
import { latestCompleteWeekRange } from "@/lib/sync/sync-redash";

// Just the numbers the email report needs — a lighter query than the full
// dashboard page's (no per-MID/WoW breakdowns, since those are charts and
// the email doesn't try to reproduce the live dashboard's full chart set).
export async function getEmailReportData() {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  // creditConsumption.*/customersReached.* snapshots are written once per
  // completed calendar week (see syncCreditConsumptionByWeek in
  // sync-redash.ts), each dated to that week's own start — not once per
  // day. A naive "rolling last 7 calendar days ending now" window only
  // overlaps that single dated snapshot on the first day or two of the
  // new week; the rest of the week it's a real, structural gap (reads as
  // ₹0, not a sync failure). Query the exact boundaries the sync itself
  // writes under instead, so this always finds the latest complete week
  // regardless of what day "now" falls on.
  const week = latestCompleteWeekRange();
  const weekFromStr = week.start.toISOString().slice(0, 10);
  const weekToStr = week.end.toISOString().slice(0, 10);
  const weekDateRange = { from: weekFromStr, to: weekToStr };

  // Same population as the live dashboard's own Credit Consumption /
  // Adoption sections (paymentCollected > 0, restricted further by
  // paymentCollectedDate when a date range applies) — matching it exactly
  // so the email's numbers aren't a second, slightly different definition
  // of the same metrics.
  const salesStatusWhere: Prisma.MerchantWhereInput = { paymentCollected: { gt: 0 } };
  const where: Prisma.MerchantWhereInput = {
    ...salesStatusWhere,
    OR: [{ paymentCollectedDate: null }, { paymentCollectedDate: { gte: from, lte: to } }],
  };

  const [creditMerchants, salesStatusMerchants, allTimeCreditSnapshots, onboardingRequests] = await Promise.all([
    prisma.merchant.findMany({
      where,
      include: {
        snapshots: {
          where: {
            fieldName: {
              in: [
                "creditConsumption.total",
                "creditConsumption.campaigns",
                "creditConsumption.automations",
                "creditConsumption.loyalty",
                "customersReached.total",
                "customersReached.campaigns",
                "customersReached.automations",
                "customersReached.loyalty",
              ],
            },
            capturedAt: { gte: week.start, lte: week.end },
          },
        },
      },
    }),
    prisma.merchant.findMany({ where: salesStatusWhere }),
    // ARPU is all-time, not bound by any date window — same "latest"
    // treatment as the live dashboard's own ARPU query.
    prisma.merchantSnapshot.findMany({
      where: { fieldName: "creditConsumption.total" },
      select: { merchantId: true, value: true },
    }),
    prisma.onboardingRequest.findMany({
      where: { merchantId: { not: null } },
      select: { merchantId: true, loyaltyEnabled: true },
    }),
  ]);

  const serialized = creditMerchants.map(({ snapshots, ...m }) => ({
    merchant: serializeMerchant(m),
    snapshots: snapshots.map(serializeSnapshot),
  }));
  const mList = serialized.map((r) => r.merchant);
  const salesStatusMList = salesStatusMerchants.map(serializeMerchant);
  const snapshotsByMerchant = Object.fromEntries(serialized.map((r) => [r.merchant.id, r.snapshots]));

  const allTimeCreditTotalByMerchant: Record<string, number> = {};
  for (const s of allTimeCreditSnapshots) {
    allTimeCreditTotalByMerchant[s.merchantId] = (allTimeCreditTotalByMerchant[s.merchantId] ?? 0) + Number(s.value);
  }

  // Same signal as the live dashboard's Activation Funnel / Adoption
  // Status: crmStatus (Redash-synced) for CRM activation, and the
  // onboarding sheet's loyaltyEnabled write-back for loyalty licensing —
  // deliberately not crmTarget/crmLicenseRequested (see dashboard-data.ts
  // and the onboarding-request schema comments for why those are distinct
  // signals from actual activation/licensing).
  const crmActivatedCount = mList.filter((m) => m.crmStatus === "Active").length;
  const loyaltyLicensedIds = new Set(
    onboardingRequests.filter((r) => r.loyaltyEnabled).map((r) => r.merchantId!)
  );
  const totalCustomersReached = customersReachedTable(mList, snapshotsByMerchant, weekDateRange).reduce(
    (a, r) => a + r.total,
    0
  );

  return {
    fromStr,
    toStr,
    weekFromStr,
    weekToStr,
    sales: salesStatus(salesStatusMList),
    potentialClosure: potentialClosureSummary(salesStatusMList),
    credit: creditConsumptionKpis(mList, snapshotsByMerchant, weekDateRange),
    arpu: arpu(salesStatusMList, allTimeCreditTotalByMerchant),
    adoption: {
      ...adoptionStats(mList),
      loyaltyLicensedCount: loyaltyLicensedIds.size,
      crmActivatedCount,
      customersReached: totalCustomersReached,
    },
  };
}

export type EmailReportData = Awaited<ReturnType<typeof getEmailReportData>>;
