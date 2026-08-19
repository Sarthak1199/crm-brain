import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeMerchant, serializeSnapshot } from "@/lib/serialize";
import { PageHeader } from "@/components/page-header";
import { SyncStatusBar } from "@/components/sync-status-bar";
import { DatabaseFilters } from "./database-filters";
import { MerchantTable } from "./merchant-table";

type SearchParams = {
  q?: string;
  crm?: string;
  loyalty?: string;
  onboarded?: string;
};

export default async function DatabasePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const where: Prisma.MerchantWhereInput = {};
  if (params.q) {
    where.brandName = { contains: params.q, mode: "insensitive" };
  }
  if (params.crm && params.crm !== "all") {
    where.crmStatus = params.crm as Prisma.EnumCrmStatusFilter["equals"];
  }
  // "Loyalty License" reflects whether ops has granted the license (the
  // onboarding sheet's write-back), not whether the merchant is actively
  // using loyalty — so this filters on OnboardingRequest.loyaltyEnabled,
  // not the usage-derived Merchant.loyaltyStatus field.
  if (params.loyalty === "Active") {
    where.onboardingRequests = { some: { loyaltyEnabled: true } };
  } else if (params.loyalty === "Inactive") {
    where.onboardingRequests = { none: { loyaltyEnabled: true } };
  }
  if (params.onboarded && params.onboarded !== "all") {
    where.onboarded = params.onboarded as Prisma.EnumOnboardStatusFilter["equals"];
  }

  const merchants = await prisma.merchant.findMany({
    where,
    orderBy: { brandName: "asc" },
    include: {
      snapshots: {
        where: { fieldName: "creditConsumption.total" },
        orderBy: { capturedAt: "asc" },
      },
      onboardingRequests: { select: { loyaltyEnabled: true } },
    },
  });

  const rows = merchants.map(({ snapshots, onboardingRequests, ...merchant }) => ({
    merchant: serializeMerchant(merchant),
    snapshots: snapshots.map(serializeSnapshot),
    loyaltyLicensed: onboardingRequests.some((r) => r.loyaltyEnabled),
  }));

  return (
    <div>
      <PageHeader
        title="Merchant Database"
        description="Every Mx tracked across sales, onboarding, and adoption — click a row for the full profile."
      />

      <div className="sticky top-16 z-[5] -mx-6 mb-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DatabaseFilters />
          <SyncStatusBar />
        </div>
      </div>

      <MerchantTable rows={rows} />
    </div>
  );
}
