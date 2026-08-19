import { Lightbulb } from "lucide-react";
import type { SerializedMerchant } from "@/lib/serialize";
import { formatInr } from "@/lib/format";

function computeInsights(merchants: SerializedMerchant[]): string[] {
  const insights: string[] = [];

  const churned = merchants.filter((m) => !!m.closureDate);
  if (churned.length > 0) {
    const names = churned.map((m) => m.brandName).join(", ");
    insights.push(
      `${churned.length} Mx churned this window (${names}) — flag for renewal outreach.`
    );
  }

  const stalledPilots = merchants.filter(
    (m) => m.crmStatus !== "Active" && m.wabaStatus === "Inactive"
  );
  if (stalledPilots.length > 0) {
    insights.push(
      `${stalledPilots.map((m) => m.brandName).join(", ")} still pending WABA activation before scaling their pilot.`
    );
  }

  const topPotential = [...merchants]
    .filter((m) => m.crmStatus === "Active")
    .sort((a, b) => b.totalYearlyPotential - a.totalYearlyPotential)[0];
  if (topPotential) {
    insights.push(
      `${topPotential.brandName} is the largest active CRM account by yearly potential (${formatInr(
        topPotential.totalYearlyPotential,
        { compact: true }
      )}).`
    );
  }

  return insights.slice(0, 3);
}

export function InsightsPanel({ merchants }: { merchants: SerializedMerchant[] }) {
  const insights = computeInsights(merchants);
  if (insights.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-brand-tint-border bg-brand-tint px-5 py-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Lightbulb className="size-4 text-primary" />
        <h3 className="text-[13px] font-semibold text-foreground">Insights</h3>
      </div>
      <ul className="flex flex-col gap-1.5">
        {insights.map((line, i) => (
          <li key={i} className="text-[13px] leading-snug text-foreground/90">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
