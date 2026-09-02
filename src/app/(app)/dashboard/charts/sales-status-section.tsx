"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { IndianRupee, Building2, ArrowUpRight } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { StatCard } from "@/components/stat-card";
import { formatInr, formatNumber } from "@/lib/format";
import { CHART_BRAND, CHART_GRAY, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import { bucketForValue, potentialClosureBuckets, type PotentialClosureBucketKey, type salesStatus } from "@/lib/dashboard-data";
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
type PanelFilter = "all" | "pending" | PotentialClosureBucketKey;

const BUCKET_COLORS: Record<PotentialClosureBucketKey, string> = {
  closed: CHART_GRAY,
  small: CHART_BRAND,
  mid: "#F59E0B",
  large: "#10B981",
};

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

function BucketPieChart({
  buckets,
  dataKey,
  formatter,
  onSelectBucket,
}: {
  buckets: ReturnType<typeof potentialClosureBuckets>;
  dataKey: "value" | "branches";
  formatter: (n: number) => string;
  onSelectBucket: (key: PotentialClosureBucketKey) => void;
}) {
  const total = buckets.reduce((a, b) => a + b[dataKey], 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={buckets}
              dataKey={dataKey}
              nameKey="label"
              innerRadius={40}
              outerRadius={58}
              paddingAngle={2}
              stroke="none"
              cursor="pointer"
              onClick={(entry) => {
                const key = (entry as unknown as { payload?: { key?: PotentialClosureBucketKey } })?.payload?.key;
                if (key) onSelectBucket(key);
              }}
            >
              {buckets.map((b) => (
                <Cell key={b.key} fill={BUCKET_COLORS[b.key]} />
              ))}
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
      <div className="flex flex-1 flex-col gap-1.5">
        {buckets.map((b) => (
          <button
            type="button"
            key={b.key}
            onClick={() => onSelectBucket(b.key)}
            className="flex items-center gap-2 rounded-md text-left hover:bg-muted/40"
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: BUCKET_COLORS[b.key] }} />
            <span className="flex-1 truncate text-[12px] text-muted-foreground">{b.label}</span>
            <span className="text-[12px] font-medium text-foreground">{formatter(b[dataKey])}</span>
          </button>
        ))}
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

  const buckets = useMemo(() => potentialClosureBuckets(merchants), [merchants]);

  const panelMerchants = useMemo(() => {
    if (panelFilter === "all") return merchants;
    if (panelFilter === "pending") return merchants.filter((m) => m.pendingPotentialClosure > 0);
    return merchants.filter((m) => bucketForValue(m.pendingPotentialClosure) === panelFilter);
  }, [merchants, panelFilter]);

  function openPanel(filter: PanelFilter) {
    setPanelFilter(filter);
    setPanelOpen(true);
  }

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
        title="Pending Potential Closure"
        description="Distribution of pending deals by size (payment collected > 0)"
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              By value (INR)
            </p>
            <BucketPieChart
              buckets={buckets}
              dataKey="value"
              formatter={(n) => formatInr(n, { compact: true })}
              onSelectBucket={openPanel}
            />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              By branches
            </p>
            <BucketPieChart
              buckets={buckets}
              dataKey="branches"
              formatter={(n) => formatNumber(n)}
              onSelectBucket={openPanel}
            />
          </div>
        </div>
      </ChartCard>

      <PaymentsPanel merchants={panelMerchants} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
}
