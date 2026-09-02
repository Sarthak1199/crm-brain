"use client";

import { useState } from "react";
import { Wallet, Bot, Megaphone, Gift, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { formatInr, formatNumber } from "@/lib/format";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { arpu, creditConsumptionKpis } from "@/lib/dashboard-data";

function ArpuDetailsDialog({
  data,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof arpu>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Paying merchants (payment collected > 0)", value: formatNumber(data.merchantCount) },
    { label: "Merchants with a Per outlet commercials rate", value: formatNumber(data.perOutletMerchantCount) },
    { label: "Avg. Per outlet commercials (closures sheet)", value: formatInr(data.avgPerOutletCommercials) },
    { label: "All-time credit consumption, summed", value: formatInr(data.creditRevenue) },
    { label: "Closed branches, summed", value: formatNumber(data.branchCount) },
    { label: "Credit consumption ÷ branches", value: formatInr(data.creditPerBranch) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ARPU — how this is calculated</DialogTitle>
          <DialogDescription>
            Avg. Per outlet commercials + (all-time credit consumption ÷ closed branches), both per branch/year.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium text-foreground">{r.value}</span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2 text-[13px]">
            <span className="font-medium text-foreground">
              ARPU ({formatInr(data.avgPerOutletCommercials)} + {formatInr(data.creditPerBranch)})
            </span>
            <span className="font-semibold text-foreground">{formatInr(data.value)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreditConsumptionKpiSection({
  data,
  arpu: arpuData,
}: {
  data: ReturnType<typeof creditConsumptionKpis>;
  arpu: ReturnType<typeof arpu>;
}) {
  const [arpuDialogOpen, setArpuDialogOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        icon={Wallet}
        label="Total Credit Consumed"
        value={formatInr(data.totalConsumed, { compact: true })}
        sources={CHART_SOURCES.creditConsumptionKpis}
      />
      <StatCard
        icon={Bot}
        label="Total Automation Credits"
        value={formatInr(data.automation, { compact: true })}
        sources={CHART_SOURCES.creditConsumptionKpis}
      />
      <StatCard
        icon={Megaphone}
        label="Total Campaign Credits"
        value={formatInr(data.campaigns, { compact: true })}
        sources={CHART_SOURCES.creditConsumptionKpis}
      />
      <StatCard
        icon={Gift}
        label="Total Loyalty Credits"
        value={formatInr(data.loyalty, { compact: true })}
        sources={CHART_SOURCES.creditConsumptionKpis}
      />
      <StatCard
        icon={TrendingUp}
        label="ARPU"
        value={formatInr(arpuData.value, { compact: true })}
        sources={CHART_SOURCES.creditConsumptionKpis}
        latest
        onViewDetails={() => setArpuDialogOpen(true)}
      />

      <ArpuDetailsDialog data={arpuData} open={arpuDialogOpen} onOpenChange={setArpuDialogOpen} />
    </div>
  );
}
