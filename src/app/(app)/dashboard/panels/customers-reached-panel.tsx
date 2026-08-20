"use client";

import { formatInr } from "@/lib/format";
import { TypedAdoptionPanel, type CommonAdoptionRow, type ExtraColumn } from "./typed-adoption-panel";

export type CustomersReachedRow = CommonAdoptionRow & {
  campaigns: number;
  loyalty: number;
  automations: number;
  total: number;
};

const EXTRA_COLUMNS: ExtraColumn<CustomersReachedRow>[] = [
  {
    key: "automations",
    label: "Automation",
    align: "right",
    accessor: (r) => r.automations,
    render: (r) => formatInr(r.automations, { compact: true }),
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
    key: "total",
    label: "Total Credit Consumption",
    align: "right",
    accessor: (r) => r.total,
    render: (r) => formatInr(r.total, { compact: true }),
  },
];

export function CustomersReachedPanel({
  rows,
  open,
  onOpenChange,
}: {
  rows: CustomersReachedRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <TypedAdoptionPanel
      title="Customers Reached — Credit Consumption"
      description="Credit consumption by merchant, broken down by Automation, Campaigns, and Loyalty."
      rows={rows}
      extraColumns={EXTRA_COLUMNS}
      defaultSortKey="total"
      defaultDirection="desc"
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
