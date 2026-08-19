import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { SyncStatusBar } from "@/components/sync-status-bar";
import { OnboardingForm } from "./onboarding-form";
import { OnboardingKpis } from "./onboarding-kpis";
import { OnboardingDetailsTable } from "./onboarding-details-table";

export default async function OnboardingPage() {
  const [requests, merchants, comboMerchants] = await Promise.all([
    prisma.onboardingRequest.findMany({ orderBy: { timestamp: "desc" } }),
    prisma.merchant.findMany({
      select: {
        id: true,
        brandName: true,
        totalStores: true,
        crmStatus: true,
        wabaStatus: true,
        onboardingRequests: { select: { loyaltyEnabled: true } },
      },
      orderBy: { brandName: "asc" },
    }),
    prisma.merchant.findMany({
      select: { id: true, brandName: true, dotpeMid: true, ristaBrandId: true },
      orderBy: { brandName: "asc" },
    }),
  ]);

  const requestsRaised = requests.length;
  const licenseEnabled = requests.filter((r) => r.loyaltyEnabled || r.crmEnabled).length;
  const finalOnboarded = requests.filter(
    (r) => r.loyaltyEnabled && (!r.crmLicenseRequested || r.crmEnabled)
  ).length;

  const requestRows = requests.map((r) => ({
    id: r.id,
    businessName: r.businessName,
    enterpriseMerchantId: r.enterpriseMerchantId,
    loyaltyType: r.loyaltyType,
    crmLicenseRequested: r.crmLicenseRequested,
    loyaltyEnabled: r.loyaltyEnabled,
    crmEnabled: r.crmEnabled,
    timestamp: r.timestamp ? r.timestamp.toISOString() : null,
    createdViaPlatform: r.createdViaPlatform,
  }));

  const detailsRows = merchants.map((m) => ({
    id: m.id,
    brandName: m.brandName,
    totalStores: m.totalStores,
    // Real CRM license state from Redash (query 10505's crm_status), not
    // usage. Loyalty is still the onboarding sheet's ops-confirmed write-back.
    crmStatus: m.crmStatus === "NA" ? "Inactive" : m.crmStatus,
    loyaltyStatus: m.onboardingRequests.some((r) => r.loyaltyEnabled) ? "Active" : "Inactive",
    wabaStatus: m.wabaStatus,
  }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Onboarding"
          description="Loyalty & CRM license requests — raised here or via the original Google Form."
        />
        <OnboardingForm merchants={comboMerchants} />
      </div>

      <div className="sticky top-16 z-[5] -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <SyncStatusBar />
        </div>
      </div>

      <div className="mb-6">
        <OnboardingKpis
          requestsRaised={requestsRaised}
          licenseEnabled={licenseEnabled}
          finalOnboarded={finalOnboarded}
          requests={requestRows}
        />
      </div>

      <h2 className="mb-3 text-[16px] font-semibold text-foreground">Merchant License Status</h2>
      <OnboardingDetailsTable rows={detailsRows} />
    </div>
  );
}
