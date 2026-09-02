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

// Just the numbers the email report needs — a lighter query than the full
// dashboard page's (no per-MID/WoW breakdowns, since those are charts and
// the email doesn't try to reproduce the live dashboard's full chart set).
export async function getEmailReportData() {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

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
  const capturedAtFilter: Prisma.DateTimeFilter = { gte: from, lte: new Date(`${toStr}T23:59:59.999Z`) };

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
            capturedAt: capturedAtFilter,
          },
        },
      },
    }),
    prisma.merchant.findMany({ where: salesStatusWhere }),
    // ARPU is all-time, not bound by the report's 7-day window — same
    // "latest" treatment as the live dashboard's own ARPU query.
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
  const dateRange = { from: fromStr, to: toStr };

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
  const totalCustomersReached = customersReachedTable(mList, snapshotsByMerchant, dateRange).reduce(
    (a, r) => a + r.total,
    0
  );

  return {
    fromStr,
    toStr,
    sales: salesStatus(salesStatusMList),
    potentialClosure: potentialClosureSummary(salesStatusMList),
    credit: creditConsumptionKpis(mList, snapshotsByMerchant, dateRange),
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
