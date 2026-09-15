import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canMutate } from "@/lib/authz";
import { serializeMerchant, serializeSnapshot, serializeRoadmapItem, serializeSupportRequest } from "@/lib/serialize";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncStatusBar } from "@/components/sync-status-bar";
import {
  activationFunnelByBranches,
  activationFunnelByMx,
  adoptionStats,
  arpu,
  creditBreakupByMid,
  creditConsumptionKpis,
  creditConsumptionTable,
  creditsByMid,
  customersReachedByChannel,
  customersReachedTable,
  productStatusStages,
  requestTypeStats,
  salesStatus,
  wowCreditTrend,
} from "@/lib/dashboard-data";
import { latestCompleteWeekRange } from "@/lib/sync/sync-redash";
import { DashboardFilters } from "./dashboard-filters";
import { ActivationFunnelSection } from "./charts/funnel-section";
import { SalesStatusSection } from "./charts/sales-status-section";
import { CreditConsumptionSection } from "./charts/credit-consumption-section";
import { CreditConsumptionKpiSection } from "./charts/credit-consumption-kpis";
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
  const session = await auth();
  const canEditRoadmap = canMutate(session?.user?.role, "roadmap");

  // An explicit mx selection (which merchants, not which time window)
  // narrows every section on the page equally.
  const mxWhere: Prisma.MerchantWhereInput = {};
  if (selectedIds.length > 0) {
    mxWhere.id = { in: selectedIds };
  }

  // Sales Status ("Total Collected (INR)"/"(Branches)" and both donut
  // charts) is tagged `latest` in the UI — an all-time snapshot the date
  // filter isn't supposed to touch, same promise as every other `latest`
  // chart on this page.
  //
  // Excludes merchants with no payment collected yet — filtered here at the
  // query level (not a UI-side hide), per the Sales View KPI spec, but only
  // for Sales Status's own sums, the Payments drill-down, and the Potential
  // Closure chart (this where clause). It must NOT leak into `where` below
  // — Activation Funnel, Credit Consumption, Adoption Status, and Customers
  // Reached all need the full targeted/whitelisted population, since a
  // merchant actively consuming credits or reaching customers hasn't
  // necessarily paid yet. It did leak in once already: `where` used to be
  // `{ ...salesStatusWhere }`, which silently dropped every
  // not-yet-paying merchant's credit consumption from those KPIs — e.g.
  // the dashboard read ~₹3.1L consumed over the last 30 days against
  // Redash's own ~₹9.3L for the same population/window once unscoped.
  const salesStatusWhere: Prisma.MerchantWhereInput = { paymentCollected: { gt: 0 }, ...mxWhere };

  const where: Prisma.MerchantWhereInput = { ...mxWhere };
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
  // creditConsumption.*/customersReached.* snapshots are written once per
  // completed calendar week (see latestCompleteWeekRange in
  // sync-redash.ts), dated to that week's own Monday — not once per day.
  // A selected range narrower than a week (the "7D" preset, or any custom
  // pick under 7 days) can miss that single dated snapshot entirely,
  // reading as a misleading ₹0/0 rather than a real gap — the same issue
  // already fixed for the email report. Widen the *lower* bound only
  // (never the upper) far enough to guarantee it always includes the
  // latest complete week as of the selected `to` (or now, if `to` isn't
  // set) — 30D/60D/90D are already comfortably wider than this and are
  // left untouched; this only ever extends `from` backward, never forward.
  const latestWeek = latestCompleteWeekRange(params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined);
  const creditFrom = params.from
    ? new Date(Math.min(new Date(params.from).getTime(), latestWeek.start.getTime()))
    : latestWeek.start;
  const creditFromStr = creditFrom.toISOString().slice(0, 10);
  const creditDateRange = { from: creditFromStr, to: params.to };

  const capturedAtFilter: Prisma.DateTimeFilter = { gte: creditFrom };
  if (params.to) capturedAtFilter.lte = new Date(`${params.to}T23:59:59.999Z`);
  const snapshotDateFilter: Prisma.MerchantSnapshotWhereInput = { capturedAt: capturedAtFilter };

  const [
    merchants,
    salesStatusMerchants,
    allMerchants,
    roadmapItems,
    supportRequests,
    onboardingRequests,
    allTimeCreditSnapshots,
  ] = await Promise.all([
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
                  "customersReached.total",
                  "customersReached.campaigns",
                  "customersReached.automations",
                  "customersReached.loyalty",
                ],
              },
              ...snapshotDateFilter,
            },
            orderBy: { capturedAt: "asc" },
          },
        },
      }),
      prisma.merchant.findMany({ where: salesStatusWhere, orderBy: { brandName: "asc" } }),
      prisma.merchant.findMany({ select: { id: true, brandName: true }, orderBy: { brandName: "asc" } }),
      prisma.roadmapItem.findMany({ orderBy: { title: "asc" } }),
      prisma.supportRequest.findMany(),
      prisma.onboardingRequest.findMany({
        where: { merchantId: { not: null } },
        select: { merchantId: true, loyaltyEnabled: true },
      }),
      // ARPU is deliberately all-time, not bound by the page's date filter
      // (same "latest" treatment as Sales Status) — a separate, unfiltered
      // query rather than reusing the date-bounded `snapshots` include
      // above, which would silently exclude consumption outside whatever
      // window happens to be selected.
      prisma.merchantSnapshot.findMany({
        where: { fieldName: "creditConsumption.total" },
        select: { merchantId: true, value: true },
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
  const salesStatusMList = salesStatusMerchants.map(serializeMerchant);
  const snapshotsByMerchant = Object.fromEntries(
    serialized.map((r) => [r.merchant.id, r.snapshots])
  );

  const allTimeCreditTotalByMerchant: Record<string, number> = {};
  for (const s of allTimeCreditSnapshots) {
    allTimeCreditTotalByMerchant[s.merchantId] =
      (allTimeCreditTotalByMerchant[s.merchantId] ?? 0) + Number(s.value);
  }
  const arpuData = arpu(salesStatusMList, allTimeCreditTotalByMerchant);

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
          <SalesStatusSection data={salesStatus(salesStatusMList)} merchants={salesStatusMList} />
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Credit Consumption</h2>
          <div className="flex flex-col gap-5">
            <CreditConsumptionKpiSection
              data={creditConsumptionKpis(mList, snapshotsByMerchant, creditDateRange)}
              arpu={arpuData}
            />
            <CreditConsumptionSection
              byMid={creditsByMid(mList)}
              breakup={creditBreakupByMid(mList, snapshotsByMerchant, creditDateRange)}
              {...wowCreditTrend(mList, snapshotsByMerchant, creditDateRange)}
              detailsRows={creditConsumptionTable(mList, snapshotsByMerchant, creditDateRange)}
            />
            <Suspense fallback={<Skeleton className="h-[352px] w-full rounded-xl" />}>
              <OverallTrendLoader from={creditDateRange.from} to={creditDateRange.to} />
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
            customersReachedByChannel={customersReachedByChannel(mList, snapshotsByMerchant, creditDateRange)}
            customersReachedRows={customersReachedTable(mList, snapshotsByMerchant, creditDateRange)}
          />
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-foreground">Product Status</h2>
          <ProductStatusSection
            stages={productStatusStages(roadmapRows)}
            requestStats={requestTypeStats(requestRows)}
            roadmapItems={roadmapRows}
            canEditRoadmap={canEditRoadmap}
          />
        </section>
      </div>
    </div>
  );
}
