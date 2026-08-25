"use client";

import { useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { IndianRupee, Building2 } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { StatCard } from "@/components/stat-card";
import { formatInr, formatNumber } from "@/lib/format";
import { CHART_BRAND, CHART_GRAY, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import type { salesStatus } from "@/lib/dashboard-data";
import type { SerializedMerchant } from "@/lib/serialize";
import { PaymentsPanel } from "../panels/payments-panel";

type SalesStatus = ReturnType<typeof salesStatus>;
type PaymentsRow = Pick<SerializedMerchant, "id" | "brandName" | "dotpeMid" | "paymentCollected" | "paymentCollectedDate" | "closedBranches">;

function DonutChart({
  pending,
  closed,
  formatter,
}: {
  pending: number;
  closed: number;
  formatter: (n: number) => string;
}) {
  const data = [
    { name: "Closed", value: closed },
    { name: "Pending", value: pending },
  ];
  const total = pending + closed;

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={44}
              outerRadius={64}
              paddingAngle={2}
              stroke="none"
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
          <span className="text-[11px] text-muted-foreground">Total</span>
          <span className="text-[13px] font-semibold text-foreground">{formatter(total)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: CHART_BRAND }} />
          <span className="text-[12px] text-muted-foreground">Closed</span>
          <span className="text-[13px] font-medium text-foreground">{formatter(closed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: CHART_GRAY }} />
          <span className="text-[12px] text-muted-foreground">Pending</span>
          <span className="text-[13px] font-medium text-foreground">{formatter(pending)}</span>
        </div>
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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <ChartCard title="Pending vs Closed" description="By value (INR)" sources={CHART_SOURCES.salesStatus} latest>
        <DonutChart
          pending={data.inr.pending}
          closed={data.inr.closed}
          formatter={(n) => formatInr(n, { compact: true })}
        />
      </ChartCard>
      <ChartCard title="Pending vs Closed" description="By branches" sources={CHART_SOURCES.salesStatus} latest>
        <DonutChart
          pending={data.branches.pending}
          closed={data.branches.closed}
          formatter={(n) => formatNumber(n)}
        />
      </ChartCard>
      <StatCard
        icon={IndianRupee}
        label="Total Collected (INR)"
        value={formatInr(data.totalCollectedInr, { compact: true })}
        sources={CHART_SOURCES.salesStatus}
        latest
        onViewDetails={() => setPanelOpen(true)}
      />
      <StatCard
        icon={Building2}
        label="Total Collected (Branches)"
        value={formatNumber(data.totalCollectedBranches)}
        sources={CHART_SOURCES.salesStatus}
        latest
        onViewDetails={() => setPanelOpen(true)}
      />

      <PaymentsPanel merchants={merchants} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
}
