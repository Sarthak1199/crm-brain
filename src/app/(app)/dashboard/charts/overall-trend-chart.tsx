"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/chart-card";
import { formatInr, formatDate } from "@/lib/format";
import { CHART_BRAND, CHART_GRID, CHART_AXIS, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";
import { CHART_SOURCES } from "@/lib/sync/source-links";

const AXIS_TICK = { fontSize: 11, fill: CHART_AXIS };
const legendStyle = { fontSize: 12, paddingTop: 8 };
const EMERALD = "#10B981";

export function OverallTrendChart({
  data,
}: {
  data: { week: string; consumed: number; recharged: number }[];
}) {
  return (
    <ChartCard
      title="WoW Credit Consumption"
      description="Overall — consumed vs recharged, portfolio-wide"
      className="lg:col-span-2"
      sources={CHART_SOURCES.wowOverall}
    >
      {data.length > 0 ? (
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
              <Line type="monotone" dataKey="consumed" name="Consumed (₹)" stroke={CHART_BRAND} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="recharged" name="Recharged (₹)" stroke={EMERALD} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-64 w-full items-center justify-center text-[13px] text-muted-foreground">
          No portfolio trend data yet — run a Redash sync to populate this.
        </div>
      )}
    </ChartCard>
  );
}
