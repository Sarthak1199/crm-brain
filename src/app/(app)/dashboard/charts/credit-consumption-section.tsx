"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import { formatInr, formatNumber, formatDate } from "@/lib/format";
import { CHART_BRAND, CHART_GRAY, CHART_GRID, CHART_AXIS, SERIES_COLORS, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import { CreditConsumptionPanel, type CreditConsumptionRow } from "../panels/credit-consumption-panel";

const AXIS_TICK = { fontSize: 11, fill: CHART_AXIS };
const legendStyle = { fontSize: 12, paddingTop: 8 };
const VIOLET = "#8B5CF6";

function ViewDetailsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-primary hover:underline"
    >
      View details
      <ArrowUpRight className="size-3" />
    </button>
  );
}

export function CreditConsumptionSection({
  byMid,
  breakup,
  data,
  merchantNames,
  detailsRows,
}: {
  byMid: { name: string; pre: number; post: number }[];
  breakup: { name: string; campaigns: number; loyalty: number; automations: number }[];
  data: Record<string, number | string>[];
  merchantNames: string[];
  detailsRows: CreditConsumptionRow[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <ChartCard
        title="Pre vs Post CRM Credits"
        description="Top merchants by CRM credit spend"
        sources={CHART_SOURCES.creditPrePost}
        action={<ViewDetailsButton onClick={() => setDetailsOpen(true)} />}
        latest
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMid} margin={{ top: 8, right: 8, left: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => formatInr(v, { compact: true })} />
              <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} formatter={(value) => formatInr(Number(value))} cursor={{ fill: "rgba(17,136,239,0.06)" }} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="pre" name="Pre-CRM" fill={CHART_GRAY} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="post" name="Post-CRM" fill={CHART_BRAND} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Consumption Breakdown"
        description="Top merchants, by category"
        sources={CHART_SOURCES.creditBreakdown}
        action={<ViewDetailsButton onClick={() => setDetailsOpen(true)} />}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakup} margin={{ top: 8, right: 8, left: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => formatInr(v, { compact: true })} />
              <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} formatter={(value) => formatInr(Number(value))} cursor={{ fill: "rgba(17,136,239,0.06)" }} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="campaigns" name="Campaigns" stackId="a" fill={CHART_BRAND} radius={[0, 0, 0, 0]} maxBarSize={28} />
              <Bar dataKey="loyalty" name="Loyalty" stackId="a" fill={VIOLET} maxBarSize={28} />
              <Bar dataKey="automations" name="Automations" stackId="a" fill={CHART_GRAY} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="WoW Credit Consumption"
        description="Trend for top merchants by MID"
        className="lg:col-span-2"
        sources={CHART_SOURCES.wowByMid}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis
                dataKey="week"
                tick={AXIS_TICK}
                axisLine={{ stroke: CHART_GRID }}
                tickLine={false}
                tickFormatter={(v: string) => formatDate(v)}
              />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => formatInr(v, { compact: true })} />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                labelFormatter={(v) => formatDate(String(v))}
                formatter={(value) => formatInr(Number(value))}
              />
              <Legend wrapperStyle={legendStyle} />
              {merchantNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <CreditConsumptionPanel rows={detailsRows} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
}
