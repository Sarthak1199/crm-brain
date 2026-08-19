"use client";

import { useState } from "react";
import { FileText, KeyRound, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { formatNumber } from "@/lib/format";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import { OnboardingRequestsPanel, type OnboardingRequestRow } from "./onboarding-requests-panel";

export function OnboardingKpis({
  requestsRaised,
  licenseEnabled,
  finalOnboarded,
  requests,
}: {
  requestsRaised: number;
  licenseEnabled: number;
  finalOnboarded: number;
  requests: OnboardingRequestRow[];
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <StatCard
        icon={FileText}
        label="Requests Raised"
        value={formatNumber(requestsRaised)}
        sources={CHART_SOURCES.onboarding}
        onViewDetails={() => setPanelOpen(true)}
      />
      <StatCard
        icon={KeyRound}
        label="License Enabled"
        value={formatNumber(licenseEnabled)}
        sources={CHART_SOURCES.onboarding}
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
