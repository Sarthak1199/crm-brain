"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IndianRupee, Building2 } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { StatCard } from "@/components/stat-card";
import { formatInr, formatNumber } from "@/lib/format";
import { CHART_BRAND, CHART_GRAY, CHART_GRID, CHART_AXIS, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import { bucketForValue, potentialClosureBuckets, type PotentialClosureBucketKey, type salesStatus } from "@/lib/dashboard-data";
import type { SerializedMerchant } from "@/lib/serialize";
import { PaymentsPanel } from "../panels/payments-panel";

type SalesStatus = ReturnType<typeof salesStatus>;
type PaymentsRow = Pick<
  SerializedMerchant,
  "id" | "brandName" | "dotpeMid" | "paymentCollected" | "paymentCollectedDate" | "closedBranches" | "pendingPotentialClosure"
>;

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

function PotentialClosureChart({
  buckets,
  onSelectBucket,
}: {
  buckets: ReturnType<typeof potentialClosureBuckets>;
  onSelectBucket: (key: PotentialClosureBucketKey) => void;
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: CHART_AXIS }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            // "value" (the ₹ sum) is always 0 for the Fully Closed bucket by
            // definition — bars are charted by merchant count instead, so
            // that bucket (usually the largest) isn't an invisible zero-height
            // bar; the ₹ figure is still shown per-bucket on hover.
            formatter={(value, name, item) => {
              if (name === "count") {
                const pending = (item?.payload as { value?: number } | undefined)?.value ?? 0;
                return [`${formatNumber(Number(value))} merchants · ${formatInr(pending, { compact: true })} pending`, "Merchants"];
              }
              return [String(value), name];
            }}
            cursor={{ fill: "rgba(17,136,239,0.06)" }}
          />
          <Bar
            dataKey="count"
            name="count"
            radius={[6, 6, 0, 0]}
            maxBarSize={64}
            cursor="pointer"
            onClick={(entry) => {
              const key = (entry as { key?: PotentialClosureBucketKey })?.key;
              if (key) onSelectBucket(key);
            }}
          >
            {buckets.map((b) => (
              <Cell key={b.key} fill={b.key === "closed" ? CHART_GRAY : CHART_BRAND} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">Click a bar to view those merchants</p>
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
  const [panelBucket, setPanelBucket] = useState<PotentialClosureBucketKey | null>(null);

  const buckets = useMemo(() => potentialClosureBuckets(merchants), [merchants]);

  const panelMerchants = useMemo(() => {
    if (!panelBucket) return merchants;
    return merchants.filter((m) => bucketForValue(m.pendingPotentialClosure) === panelBucket);
  }, [merchants, panelBucket]);

  function openPanel(bucket: PotentialClosureBucketKey | null) {
    setPanelBucket(bucket);
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
        onViewDetails={() => openPanel(null)}
      />
      <StatCard
        icon={Building2}
        label="Total Collected (Branches)"
        value={formatNumber(data.totalCollectedBranches)}
        sources={CHART_SOURCES.salesStatus}
        latest
        onViewDetails={() => openPanel(null)}
      />

      <ChartCard
        title="Pending Potential Closure"
        description="Merchant count by pending deal size (payment collected > 0)"
        sources={CHART_SOURCES.salesStatus}
        className="lg:col-span-2"
        latest
      >
        <PotentialClosureChart buckets={buckets} onSelectBucket={openPanel} />
      </ChartCard>

      <PaymentsPanel merchants={panelMerchants} open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
}
