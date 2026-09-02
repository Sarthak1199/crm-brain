import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeMerchant, serializeSnapshot } from "@/lib/serialize";
import { salesStatus, potentialClosureSummary, creditConsumptionKpis, arpu } from "@/lib/dashboard-data";

// Just the numbers the email report needs — a lighter query than the full
// dashboard page's (no per-MID/WoW breakdowns, since those are charts and
// the email is plain HTML/text now, not a screenshot).
export async function getEmailReportData() {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const salesStatusWhere: Prisma.MerchantWhereInput = { paymentCollected: { gt: 0 } };
  const capturedAtFilter: Prisma.DateTimeFilter = { gte: from, lte: new Date(`${toStr}T23:59:59.999Z`) };

  const [creditMerchants, salesStatusMerchants, allTimeCreditSnapshots] = await Promise.all([
    prisma.merchant.findMany({
      where: {
        OR: [{ paymentCollectedDate: null }, { paymentCollectedDate: { gte: from, lte: to } }],
      },
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

  return {
    fromStr,
    toStr,
    sales: salesStatus(salesStatusMList),
    potentialClosure: potentialClosureSummary(salesStatusMList),
    credit: creditConsumptionKpis(mList, snapshotsByMerchant, { from: fromStr, to: toStr }),
    arpu: arpu(salesStatusMList, allTimeCreditTotalByMerchant),
  };
}

export type EmailReportData = Awaited<ReturnType<typeof getEmailReportData>>;
