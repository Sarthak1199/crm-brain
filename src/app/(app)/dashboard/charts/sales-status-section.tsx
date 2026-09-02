"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { IndianRupee, Building2, ArrowUpRight } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { StatCard } from "@/components/stat-card";
import { formatInr, formatNumber } from "@/lib/format";
import { CHART_BRAND, CHART_GRAY, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import { potentialClosureSummary, type salesStatus } from "@/lib/dashboard-data";
import type { SerializedMerchant } from "@/lib/serialize";
import { PaymentsPanel } from "../panels/payments-panel";

type SalesStatus = ReturnType<typeof salesStatus>;
type PaymentsRow = Pick<
  SerializedMerchant,
  | "id"
  | "brandName"
  | "dotpeMid"
  | "paymentCollected"
  | "paymentCollectedDate"
  | "closedBranches"
  | "pendingPotentialClosure"
  | "pendingBranches"
>;
type PanelFilter = "all" | "pending" | "closed";

function DonutChart({
  label,
  pending,
  closed,
  formatter,
  onSelect,
}: {
  label: string;
  pending: number;
  closed: number;
  formatter: (n: number) => string;
  onSelect?: (slice: "pending" | "closed") => void;
}) {
  const data = [
    { key: "closed" as const, name: "Closed", value: closed },
    { key: "pending" as const, name: "Pending", value: pending },
  ];
  const total = pending + closed;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="relative size-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={34}
              outerRadius={50}
              paddingAngle={2}
              stroke="none"
              cursor={onSelect ? "pointer" : undefined}
              onClick={(entry) => {
                const key = (entry as unknown as { payload?: { key?: "pending" | "closed" } })?.payload?.key;
                if (key) onSelect?.(key);
              }}
            >
              <Cell fill={CHART_BRAND} />
              <Cell fill={CHART_GRAY} />
            </Pie>
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(value) => formatter(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground">Total</span>
          <span className="text-[12px] font-semibold text-foreground">{formatter(total)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => onSelect?.("closed")}
          disabled={!onSelect}
          className="flex items-center gap-2 rounded-md text-left enabled:hover:bg-muted/40"
        >
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_BRAND }} />
          <span className="text-[12px] text-muted-foreground">Closed</span>
          <span className="text-[13px] font-medium text-foreground">{formatter(closed)}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect?.("pending")}
          disabled={!onSelect}
          className="flex items-center gap-2 rounded-md text-left enabled:hover:bg-muted/40"
        >
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_GRAY }} />
          <span className="text-[12px] text-muted-foreground">Pending</span>
          <span className="text-[13px] font-medium text-foreground">{formatter(pending)}</span>
        </button>
      </div>
    </div>
  );
}

export function SalesStatusSection({
  data,
  merchants,
}: {
  data: SalesStatus;
  merchants: PaymentsRow[];
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelFilter, setPanelFilter] = useState<PanelFilter>("all");

  const potentialClosure = useMemo(() => potentialClosureSummary(merchants), [merchants]);

  const panelMerchants = useMemo(() => {
    if (panelFilter === "all") return merchants;
    if (panelFilter === "pending") return merchants.filter((m) => m.pendingPotentialClosure > 0);
    return merchants.filter((m) => m.pendingPotentialClosure <= 0);
  }, [merchants, panelFilter]);

  function openPanel(filter: PanelFilter) {
    setPanelFilter(filter);
    setPanelOpen(true);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <StatCard
        icon={IndianRupee}
        label="Total Collected (INR)"
        value={formatInr(data.totalCollectedInr, { compact: true })}
        sources={CHART_SOURCES.salesStatus}
        latest
        onViewDetails={() => openPanel("all")}
      />
      <StatCard
        icon={Building2}
        label="Total Collected (Branches)"
        value={formatNumber(data.totalCollectedBranches)}
        sources={CHART_SOURCES.salesStatus}
        latest
        onViewDetails={() => openPanel("all")}
      />

      <ChartCard
        title="Pending vs Closed"
        description="Merchants, branches, and INR — from the closures sheet's own tracked figure (payment collected > 0)"
        sources={CHART_SOURCES.salesStatus}
        className="lg:col-span-2"
        latest
        action={
          <button
            type="button"
            onClick={() => openPanel("pending")}
            className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-primary hover:underline"
          >
            View details
            <ArrowUpRight className="size-3" />
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <DonutChart
            label="Merchants"
            pending={potentialClosure.merchants.pending}
            closed={potentialClosure.merchants.closed}
            formatter={(n) => formatNumber(n)}
            onSelect={openPanel}
          />
          <DonutChart
            label="Branches"
            pending={potentialClosure.branches.pending}
            closed={potentialClosure.branches.closed}
            formatter={(n) => formatNumber(n)}
            onSelect={openPanel}
          />
          <DonutChart
            label="INR"
            pending={potentialClosure.inr.pending}
            closed={potentialClosure.inr.closed}
            formatter={(n) => formatInr(n, { compact: true })}
            onSelect={openPanel}
          />
        </div>
      </ChartCard>

      <PaymentsPanel merchants={panelMerchants} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
}
