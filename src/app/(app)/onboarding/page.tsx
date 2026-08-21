import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canMutate } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { SyncStatusBar } from "@/components/sync-status-bar";
import { OnboardingForm } from "./onboarding-form";
import { OnboardingKpis } from "./onboarding-kpis";
import { OnboardingDetailsTable } from "./onboarding-details-table";

export default async function OnboardingPage() {
  const session = await auth();
  const canEdit = canMutate(session?.user?.role);
  const [requests, merchants, comboMerchants] = await Promise.all([
    prisma.onboardingRequest.findMany({ orderBy: { timestamp: "desc" } }),
    prisma.merchant.findMany({
      select: {
        id: true,
        brandName: true,
        dotpeMid: true,
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
  // CRM Adoption Redash query (10505)'s crm_status field, A = Active —
  // synced onto Merchant.crmStatus. Not the onboarding sheet's crmEnabled
  // write-back, which only reflects whether *this specific request* was
  // actioned, not the merchant's actual current license state.
  const crmLicenseEnabled = merchants.filter((m) => m.crmStatus === "Active").length;
  // "Dotpe CRM [Activation] — Loyalty enable" GSheet's write-back column.
  const loyaltyLicenseEnabled = requests.filter((r) => r.loyaltyEnabled).length;
  // wabaStatus is the app's existing "Marketing License" field (see the
  // Merchant License Status table below) — no sync currently writes it, so
  // this is honestly 0 until a real source for WhatsApp Business API status
  // is wired up, rather than approximating it from an unrelated field.
  const marketingLicenseEnabled = merchants.filter((m) => m.wabaStatus === "Active").length;
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
    dotpeMid: m.dotpeMid,
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
        {canEdit ? <OnboardingForm merchants={comboMerchants} /> : null}
      </div>

      <div className="sticky top-16 z-[5] -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <SyncStatusBar />
        </div>
      </div>

      <div className="mb-6">
        <OnboardingKpis
          requestsRaised={requestsRaised}
          crmLicenseEnabled={crmLicenseEnabled}
          loyaltyLicenseEnabled={loyaltyLicenseEnabled}
          marketingLicenseEnabled={marketingLicenseEnabled}
          finalOnboarded={finalOnboarded}
          requests={requestRows}
        />
      </div>

      <h2 className="mb-3 text-[16px] font-semibold text-foreground">Merchant License Status</h2>
      <OnboardingDetailsTable rows={detailsRows} />
    </div>
  );
}
