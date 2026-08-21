"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Heart, Zap, Target, Users } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { CHART_BRAND, CHART_GRAY, CHART_GRID, CHART_AXIS, tooltipContentStyle, tooltipLabelStyle } from "./chart-theme";
import { CHART_SOURCES, type SourceLink } from "@/lib/sync/source-links";
import { ChartCard } from "@/components/chart-card";
import type { adoptionStats } from "@/lib/dashboard-data";
import type { SerializedMerchant } from "@/lib/serialize";
import { LoyaltyPanel } from "../panels/loyalty-panel";
import { AutomationPanel } from "../panels/automation-panel";
import { CampaignPanel } from "../panels/campaign-panel";
import { CustomersReachedPanel, type CustomersReachedRow } from "../panels/customers-reached-panel";

const AXIS_TICK = { fontSize: 11, fill: CHART_AXIS };
const legendStyle = { fontSize: 12, paddingTop: 8 };
const VIOLET = "#8B5CF6";

function AdoptionKpiCard({
  icon: Icon,
  label,
  value,
  subLabel,
  active,
  total,
  color,
  sources,
  onViewDetails,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  subLabel: string;
  active: number;
  total: number;
  color: string;
  sources: SourceLink[];
  onViewDetails: () => void;
}) {
  const remaining = Math.max(total - active, 0);
  const pieData = [
    { name: "Active", value: active },
    { name: "Remaining", value: remaining },
  ];
  const hasData = total > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-none transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
          <Icon className="size-4 text-foreground" />
        </div>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Latest
        </span>
      </div>
      <p className="mt-4 text-[13px] text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mt-1 text-[28px] font-bold leading-none text-foreground">{value}</p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">{subLabel}</p>
        </div>
        {hasData ? (
          <div className="size-16 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={20} outerRadius={30} paddingAngle={2} stroke="none">
                  <Cell fill={color} />
                  <Cell fill={CHART_GRAY} />
                </Pie>
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value) => formatNumber(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <button
          type="button"
          onClick={onViewDetails}
          className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-primary hover:underline"
        >
          View details
          <ArrowUpRight className="size-3" />
        </button>
      </div>
      {sources.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground/70">
          <span>Source:</span>
          {sources.map((s, i) => (
            <span key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-muted-foreground"
              >
                {s.label}
              </a>
              {i < sources.length - 1 ? <span className="ml-1.5">·</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type AdoptionRow = Pick<
  SerializedMerchant,
  | "id"
  | "brandName"
  | "dotpeMid"
  | "totalStores"
  | "loyaltyStatus"
  | "loyaltyProgram"
  | "loyaltyPointsEarned"
  | "loyaltyPointsBurned"
  | "automationsRules"
  | "automationsTotalSent"
  | "customerCount"
  | "campaignsSetup"
  | "campaignsUsingRfm"
  | "campaignsContactsReached"
>;

export function AdoptionSection({
  data,
  merchants,
  loyaltyLicensedCount,
  crmActivatedCount,
  customersReachedByChannel,
  customersReachedRows,
}: {
  data: ReturnType<typeof adoptionStats>;
  merchants: AdoptionRow[];
  loyaltyLicensedCount: number;
  crmActivatedCount: number;
  customersReachedByChannel: { name: string; campaigns: number; loyalty: number; automations: number }[];
  customersReachedRows: CustomersReachedRow[];
}) {
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [customersReachedOpen, setCustomersReachedOpen] = useState(false);

  const rfmMerchantCount = merchants.filter((m) => m.campaignsUsingRfm > 0).length;
  const totalCustomersReached = customersReachedRows.reduce((a, r) => a + r.total, 0);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <AdoptionKpiCard
        icon={Heart}
        label="Loyalty Setups"
        value={formatNumber(data.loyaltySetups)}
        subLabel={`of ${formatNumber(loyaltyLicensedCount)} licensed`}
        active={data.loyaltySetups}
        total={loyaltyLicensedCount}
        color={CHART_BRAND}
        sources={CHART_SOURCES.adoptionStats}
        onViewDetails={() => setLoyaltyOpen(true)}
      />
      <AdoptionKpiCard
        icon={Zap}
        label="Automation Setups"
        value={formatNumber(data.automationSetups)}
        subLabel={`of ${formatNumber(crmActivatedCount)} CRM active`}
        active={data.automationSetups}
        total={crmActivatedCount}
        color={VIOLET}
        sources={CHART_SOURCES.adoptionStats}
        onViewDetails={() => setAutomationOpen(true)}
      />
      <AdoptionKpiCard
        icon={Target}
        label="RFM Campaigns Sent"
        value={formatNumber(data.rfmCampaignsSent)}
        subLabel={`${formatNumber(rfmMerchantCount)} of ${formatNumber(crmActivatedCount)} CRM active Mx`}
        active={rfmMerchantCount}
        total={crmActivatedCount}
        color="#F59E0B"
        sources={CHART_SOURCES.adoptionStats}
        onViewDetails={() => setCampaignOpen(true)}
      />

      <ChartCard
        title="Customers Reached"
        description={`${formatNumber(totalCustomersReached)} distinct customers reached across all Mx — top merchants by channel below`}
        className="lg:col-span-3"
        sources={CHART_SOURCES.customersReached}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-muted-foreground">
              <Users className="size-3.5" />
              {formatNumber(totalCustomersReached)} total
            </div>
            <button
              type="button"
              onClick={() => setCustomersReachedOpen(true)}
              className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-primary hover:underline"
            >
              View details
              <ArrowUpRight className="size-3" />
            </button>
          </div>
        }
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={customersReachedByChannel} margin={{ top: 8, right: 8, left: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} formatter={(value) => formatNumber(Number(value))} cursor={{ fill: "rgba(17,136,239,0.06)" }} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="loyalty" name="Loyalty" stackId="a" fill={CHART_BRAND} maxBarSize={28} />
              <Bar dataKey="automations" name="Automations" stackId="a" fill={VIOLET} maxBarSize={28} />
              <Bar dataKey="campaigns" name="Campaigns" stackId="a" fill={CHART_GRAY} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <LoyaltyPanel merchants={merchants} open={loyaltyOpen} onOpenChange={setLoyaltyOpen} />
      <AutomationPanel merchants={merchants} open={automationOpen} onOpenChange={setAutomationOpen} />
      <CampaignPanel merchants={merchants} open={campaignOpen} onOpenChange={setCampaignOpen} />
      <CustomersReachedPanel rows={customersReachedRows} open={customersReachedOpen} onOpenChange={setCustomersReachedOpen} />
    </div>
  );
}
