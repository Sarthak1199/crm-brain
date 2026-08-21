import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeMerchant, serializeSnapshot, serializeRoadmapItem, serializeSupportRequest } from "@/lib/serialize";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncStatusBar } from "@/components/sync-status-bar";
import {
  activationFunnelByBranches,
  activationFunnelByMx,
  adoptionStats,
  creditBreakupByMid,
  creditBreakupTable,
  creditsByMid,
  productStatusStages,
  requestTypeStats,
  salesStatus,
  wowCreditTrend,
} from "@/lib/dashboard-data";
import { DashboardFilters } from "./dashboard-filters";
import { ActivationFunnelSection } from "./charts/funnel-section";
import { SalesStatusSection } from "./charts/sales-status-section";
import { CreditConsumptionSection } from "./charts/credit-consumption-section";
import { OverallTrendLoader } from "./charts/overall-trend-loader";
import { AdoptionSection } from "./charts/adoption-section";
import { ProductStatusSection } from "./charts/product-status-section";

type SearchParams = {
  from?: string;
  to?: string;
  mx?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const selectedIds = (params.mx ?? "").split(",").filter(Boolean);

  const where: Prisma.MerchantWhereInput = {};
  if (selectedIds.length > 0) {
    where.id = { in: selectedIds };
  }
  if (params.from || params.to) {
    where.OR = [
      { paymentCollectedDate: null },
      {
        paymentCollectedDate: {
          gte: params.from ? new Date(params.from) : undefined,
          lte: params.to ? new Date(params.to) : undefined,
        },
      },
    ];
  }

  // Bound snapshots by the selected date range at the query level — every
  // downstream dashboard-data.ts function re-filters by date anyway, but
  // without this the query pulls every merchant's *entire* snapshot
  // history (4 fields x every synced week, growing weekly) on every
  // render, including on every filter change, then throws almost all of
  // it away in JS. That full-history transfer is what made changing the
  // date filter slow — narrowing the query itself is the actual fix, not
  // a debounce (there's no rapid-fire input here to debounce: date inputs
  // and preset buttons each commit a single navigation).
  const capturedAtFilter: Prisma.DateTimeFilter = {};
  if (params.from) capturedAtFilter.gte = new Date(params.from);
  if (params.to) capturedAtFilter.lte = new Date(`${params.to}T23:59:59.999Z`);
  const snapshotDateFilter: Prisma.MerchantSnapshotWhereInput =
    params.from || params.to ? { capturedAt: capturedAtFilter } : {};

  const [merchants, allMerchants, roadmapItems, supportRequests, onboardingRequests] = await Promise.all([
    prisma.merchant.findMany({
      where,
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
            ...snapshotDateFilter,
          },
          orderBy: { capturedAt: "asc" },
        },
      },
    }),
    prisma.merchant.findMany({ select: { id: true, brandName: true }, orderBy: { brandName: "asc" } }),
    prisma.roadmapItem.findMany({ orderBy: { title: "asc" } }),
    prisma.supportRequest.findMany(),
    prisma.onboardingRequest.findMany({
      where: { merchantId: { not: null } },
      select: { merchantId: true, loyaltyEnabled: true },
    }),
  ]);

  const roadmapRows = roadmapItems.map(serializeRoadmapItem);
  const requestRows = supportRequests.map(serializeSupportRequest);

  // CRM license state comes straight from Redash query 10505's crm_status
  // (A/P/E, synced onto Merchant.crmStatus) — the real license signal, not
  // a sales-stage approximation. Loyalty license still comes from the
  // onboarding sheet's write-back, since that's ops-confirmed per request.
  const crmActivatedIds = new Set(
    merchants.filter((m) => m.crmStatus === "Active").map((m) => m.id)
  );
  const loyaltyLicensedIds = new Set(
    onboardingRequests.filter((r) => r.loyaltyEnabled).map((r) => r.merchantId!)
  );

  const serialized = merchants.map(({ snapshots, ...m }) => ({
    merchant: serializeMerchant(m),
    snapshots: snapshots.map(serializeSnapshot),
  }));
  const mList = serialized.map((r) => r.merchant);
  const snapshotsByMerchant = Object.fromEntries(
    serialized.map((r) => [r.merchant.id, r.snapshots])
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Supply chain of CRM sales, onboarding, and adoption across DotPe Mx."
      />

      <div className="sticky top-16 z-[5] -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardFilters merchantOptions={allMerchants} />
          <SyncStatusBar />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Activation Funnel</h2>
          <ActivationFunnelSection
            byMx={activationFunnelByMx(mList, crmActivatedIds)}
            byBranches={activationFunnelByBranches(mList, crmActivatedIds)}
          />
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Sales Status</h2>
          <SalesStatusSection data={salesStatus(mList)} merchants={mList} />
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Credit Consumption</h2>
          <div className="flex flex-col gap-5">
            <CreditConsumptionSection
              byMid={creditsByMid(mList)}
              breakup={creditBreakupByMid(mList, snapshotsByMerchant, { from: params.from, to: params.to })}
              {...wowCreditTrend(mList, snapshotsByMerchant, { from: params.from, to: params.to })}
            />
            <Suspense fallback={<Skeleton className="h-[352px] w-full rounded-xl" />}>
              <OverallTrendLoader from={params.from} to={params.to} />
            </Suspense>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Adoption Status</h2>
          <AdoptionSection
            data={adoptionStats(mList)}
            merchants={mList}
            loyaltyLicensedCount={loyaltyLicensedIds.size}
            crmActivatedCount={crmActivatedIds.size}
            customersReachedRows={creditBreakupTable(mList, snapshotsByMerchant, { from: params.from, to: params.to })}
          />
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Product Status</h2>
          <ProductStatusSection
            stages={productStatusStages(roadmapRows)}
            requestStats={requestTypeStats(requestRows)}
            roadmapItems={roadmapRows}
          />
        </section>
      </div>
    </div>
  );
}
