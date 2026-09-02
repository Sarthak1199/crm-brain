import { Wallet, Bot, Megaphone, Gift, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { formatInr } from "@/lib/format";
import { CHART_SOURCES } from "@/lib/sync/source-links";
import type { creditConsumptionKpis } from "@/lib/dashboard-data";

export function CreditConsumptionKpiSection({ data }: { data: ReturnType<typeof creditConsumptionKpis> }) {
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
        value={formatInr(data.arpu, { compact: true })}
        subValue={data.arpuSampleSize > 0 ? `avg. of ${data.arpuSampleSize} paying Mx` : "no paying Mx with credit usage"}
        sources={CHART_SOURCES.creditConsumptionKpis}
      />
    </div>
  );
}
