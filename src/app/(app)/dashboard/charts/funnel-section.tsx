"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import { formatNumber } from "@/lib/format";
import type { FunnelStage } from "@/lib/dashboard-data";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import { CHART_BRAND, CHART_GRID, CHART_AXIS, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";

const VIOLET = "#8B5CF6";
const AMBER = "#F59E0B";
const EMERALD = "#10B981";

// The last four stages are parallel feature-adoption breakdowns, not a
// continued funnel decline — color them distinctly so that split reads
// visually, not as more attrition.
const PARALLEL_STAGES: Record<string, string> = {
  "Loyalty active": CHART_BRAND,
  "Campaigns active": VIOLET,
  "Automations active": AMBER,
  "CRM activated": EMERALD,
};

function FunnelChart({ data }: { data: FunnelStage[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 10.5, fill: CHART_AXIS }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={54}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            formatter={(value) => formatNumber(Number(value))}
            cursor={{ fill: "rgba(17,136,239,0.06)" }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={PARALLEL_STAGES[entry.stage] ?? CHART_BRAND} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: 12, fill: "var(--color-foreground)", fontWeight: 600 }}
              formatter={(value: React.ReactNode) => formatNumber(Number(value))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivationFunnelSection({
  byMx,
  byBranches,
}: {
  byMx: FunnelStage[];
  byBranches: FunnelStage[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <ChartCard title="Activation Funnel" description="By count of Mx" sources={CHART_SOURCES.activationFunnel} latest>
        <FunnelChart data={byMx} />
      </ChartCard>
      <ChartCard
        title="Activation Funnel"
        description="By count of branches"
        sources={CHART_SOURCES.activationFunnel}
        latest
      >
        <FunnelChart data={byBranches} />
      </ChartCard>
    </div>
  );
}
