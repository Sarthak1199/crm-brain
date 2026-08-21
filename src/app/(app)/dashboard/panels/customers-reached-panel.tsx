"use client";

import { formatNumber } from "@/lib/format";
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
    render: (r) => formatNumber(r.automations),
  },
  {
    key: "campaigns",
    label: "Campaigns",
    align: "right",
    accessor: (r) => r.campaigns,
    render: (r) => formatNumber(r.campaigns),
  },
  {
    key: "loyalty",
    label: "Loyalty",
    align: "right",
    accessor: (r) => r.loyalty,
    render: (r) => formatNumber(r.loyalty),
  },
  {
    key: "total",
    label: "Total Customers Reached",
    align: "right",
    accessor: (r) => r.total,
    render: (r) => formatNumber(r.total),
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
      title="Customers Reached — Per Merchant"
      description="Distinct customers reached by merchant, broken down by Automation, Campaigns, and Loyalty."
      rows={rows}
      extraColumns={EXTRA_COLUMNS}
      defaultSortKey="total"
      defaultDirection="desc"
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
