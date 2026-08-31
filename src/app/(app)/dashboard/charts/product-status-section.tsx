"use client";

import { useState } from "react";
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
import { Bug, Lightbulb, Building2, IndianRupee } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { formatNumber, formatInr } from "@/lib/format";
import type { FunnelStage, requestTypeStats } from "@/lib/dashboard-data";
import type { SerializedRoadmapItem } from "@/lib/serialize";
import { CHART_BRAND, CHART_GRID, CHART_AXIS, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import { RoadmapPanel } from "../panels/roadmap-panel";

const STAGE_COLORS: Record<string, string> = {
  "To Be Picked": "#64748B",
  "In Design": "#8B5CF6",
  "In Tech": "#3B82F6",
  "In QA": "#F59E0B",
  Shipped: "#10B981",
};

function RequestTypeCard({
  icon: Icon,
  label,
  stats,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  stats: ReturnType<typeof requestTypeStats>["bug"];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-6 text-left shadow-none transition-shadow hover:shadow-sm"
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4 text-foreground" />
      </div>
      <p className="mt-4 text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-none text-foreground">{formatNumber(stats.count)}</p>
      <div className="mt-3 flex items-center gap-4 border-t border-border pt-2.5 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Building2 className="size-3" />
          {formatNumber(stats.branches)} branches
        </span>
        <span className="inline-flex items-center gap-1">
          <IndianRupee className="size-3" />
          {formatInr(stats.potential, { compact: true })}
        </span>
      </div>
    </button>
  );
}

export function ProductStatusSection({
  stages,
  requestStats,
  roadmapItems,
  canEditRoadmap,
}: {
  stages: FunnelStage[];
  requestStats: ReturnType<typeof requestTypeStats>;
  roadmapItems: SerializedRoadmapItem[];
  canEditRoadmap: boolean;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <ChartCard
        title="Product Status"
        description="Roadmap items, by dev-lifecycle stage"
        className="lg:col-span-2"
        sources={CHART_SOURCES.productStatus}
        latest
        action={
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            View details ↗
          </button>
        }
      >
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 12, fill: CHART_AXIS }}
                axisLine={{ stroke: CHART_GRID }}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(value) => formatNumber(Number(value))}
                cursor={{ fill: "rgba(17,136,239,0.06)" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {stages.map((entry) => (
                  <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? CHART_BRAND} />
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
      </ChartCard>

      <RequestTypeCard icon={Bug} label="Bug Requests" stats={requestStats.bug} onClick={() => (window.location.href = "/requests?type=Bug")} />
      <RequestTypeCard
        icon={Lightbulb}
        label="Feature Requests"
        stats={requestStats.feature}
        onClick={() => (window.location.href = "/requests?type=Feature")}
      />

      <RoadmapPanel items={roadmapItems} canEdit={canEditRoadmap} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
}
