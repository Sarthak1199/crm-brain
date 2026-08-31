"use client";

import { formatInr, formatNumber } from "@/lib/format";
import { TypedAdoptionPanel, type CommonAdoptionRow, type ExtraColumn } from "./typed-adoption-panel";

export type CreditConsumptionRow = CommonAdoptionRow & {
  preCrmCredits: number;
  postCrmCredits: number;
  campaigns: number;
  loyalty: number;
  automations: number;
  total: number;
  customersAcquired: number;
};

const EXTRA_COLUMNS: ExtraColumn<CreditConsumptionRow>[] = [
  {
    key: "preCrmCredits",
    label: "Pre-CRM Credits",
    align: "right",
    accessor: (r) => r.preCrmCredits,
    render: (r) => formatInr(r.preCrmCredits, { compact: true }),
  },
  {
    key: "postCrmCredits",
    label: "Post-CRM Credits",
    align: "right",
    accessor: (r) => r.postCrmCredits,
    render: (r) => formatInr(r.postCrmCredits, { compact: true }),
  },
  {
    key: "campaigns",
    label: "Campaigns",
    align: "right",
    accessor: (r) => r.campaigns,
    render: (r) => formatInr(r.campaigns, { compact: true }),
  },
  {
    key: "loyalty",
    label: "Loyalty",
    align: "right",
    accessor: (r) => r.loyalty,
    render: (r) => formatInr(r.loyalty, { compact: true }),
  },
  {
    key: "automations",
    label: "Automation",
    align: "right",
    accessor: (r) => r.automations,
    render: (r) => formatInr(r.automations, { compact: true }),
  },
  {
    key: "total",
    label: "Total Consumption",
    align: "right",
    accessor: (r) => r.total,
    render: (r) => formatInr(r.total, { compact: true }),
  },
  {
    key: "customersAcquired",
    label: "Customers Acquired",
    align: "right",
    accessor: (r) => r.customersAcquired,
    render: (r) => formatNumber(r.customersAcquired),
  },
];

export function CreditConsumptionPanel({
  rows,
  open,
  onOpenChange,
}: {
  rows: CreditConsumptionRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <TypedAdoptionPanel
      title="Credit Consumption — Per Merchant"
      description="Pre/Post CRM credit totals and consumption breakdown by category, per merchant."
      rows={rows}
      extraColumns={EXTRA_COLUMNS}
      defaultSortKey="total"
      defaultDirection="desc"
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
