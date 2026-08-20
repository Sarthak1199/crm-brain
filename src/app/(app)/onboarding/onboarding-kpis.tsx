"use client";

import { useState } from "react";
import { FileText, KeyRound, Gift, Megaphone, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { formatNumber } from "@/lib/format";
import { CHART_SOURCES, REDASH_SOURCE_LINKS } from "@/lib/sync/source-links";
import { REDASH_QUERY_IDS } from "@/lib/sync/redash-query-ids";
import { OnboardingRequestsPanel, type OnboardingRequestRow } from "./onboarding-requests-panel";

export function OnboardingKpis({
  requestsRaised,
  crmLicenseEnabled,
  loyaltyLicenseEnabled,
  marketingLicenseEnabled,
  finalOnboarded,
  requests,
}: {
  requestsRaised: number;
  crmLicenseEnabled: number;
  loyaltyLicenseEnabled: number;
  marketingLicenseEnabled: number;
  finalOnboarded: number;
  requests: OnboardingRequestRow[];
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        icon={FileText}
        label="Request Raised"
        value={formatNumber(requestsRaised)}
        sources={CHART_SOURCES.onboarding}
        onViewDetails={() => setPanelOpen(true)}
      />
      <StatCard
        icon={KeyRound}
        label="CRM License Enabled"
        value={formatNumber(crmLicenseEnabled)}
        sources={[REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.crmAdoption]]}
      />
      <StatCard
        icon={Gift}
        label="Loyalty License Enabled"
        value={formatNumber(loyaltyLicenseEnabled)}
        sources={CHART_SOURCES.onboarding}
      />
      <StatCard
        icon={Megaphone}
        label="Marketing License Enabled"
        value={formatNumber(marketingLicenseEnabled)}
      />
      <StatCard
        icon={CheckCircle2}
        label="Final Onboarded"
        value={formatNumber(finalOnboarded)}
        sources={CHART_SOURCES.onboarding}
      />

      <OnboardingRequestsPanel requests={requests} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
}
