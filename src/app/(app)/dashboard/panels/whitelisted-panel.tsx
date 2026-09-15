"use client";

import { StatusBadge } from "@/components/status-badge";
import { formatInr, formatNumber } from "@/lib/format";
import type { WhitelistedMerchantRow } from "@/lib/dashboard-data";
import { TypedAdoptionPanel, type ExtraColumn } from "./typed-adoption-panel";

const COLUMNS: ExtraColumn<WhitelistedMerchantRow>[] = [
  {
    key: "paid",
    label: "Status",
    accessor: (r) => (r.paid ? 1 : 0),
    render: (r) => <StatusBadge value={r.paid ? "Paid" : "Pending"} />,
  },
  {
    key: "closedBranches",
    label: "Closed Branches",
    align: "right",
    accessor: (r) => r.closedBranches,
    render: (r) => formatNumber(r.closedBranches),
  },
  {
    key: "paymentCollected",
    label: "Payment Collected",
    align: "right",
    accessor: (r) => r.paymentCollected,
    render: (r) => formatInr(r.paymentCollected, { compact: true }),
  },
];

export function WhitelistedPanel({
  merchants,
  open,
  onOpenChange,
}: {
  merchants: WhitelistedMerchantRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <TypedAdoptionPanel
      title="CRM Whitelisted Merchants"
      description="Every whitelisted (targeted) merchant, with paid ones marked separately."
      rows={merchants}
      extraColumns={COLUMNS}
      defaultSortKey="paid"
      defaultDirection="desc"
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
