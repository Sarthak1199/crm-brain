"use client";

import { StatusBadge } from "@/components/status-badge";
import { formatNumber } from "@/lib/format";
import type { SerializedMerchant } from "@/lib/serialize";
import { TypedAdoptionPanel, type ExtraColumn } from "./typed-adoption-panel";

type Row = Pick<
  SerializedMerchant,
  "id" | "brandName" | "dotpeMid" | "totalStores" | "loyaltyStatus" | "loyaltyProgram" | "loyaltyPointsEarned" | "loyaltyPointsBurned"
>;

const COLUMNS: ExtraColumn<Row>[] = [
  {
    key: "loyaltyStatus",
    label: "Status",
    accessor: (r) => r.loyaltyStatus,
    render: (r) => <StatusBadge value={r.loyaltyStatus} />,
  },
  {
    key: "loyaltyProgram",
    label: "Program",
    accessor: (r) => r.loyaltyProgram,
    render: (r) => r.loyaltyProgram ?? "—",
  },
  {
    key: "loyaltyPointsEarned",
    label: "Pts Earned",
    align: "right",
    accessor: (r) => r.loyaltyPointsEarned,
    render: (r) => formatNumber(r.loyaltyPointsEarned),
  },
  {
    key: "loyaltyPointsBurned",
    label: "Pts Burned",
    align: "right",
    accessor: (r) => r.loyaltyPointsBurned,
    render: (r) => formatNumber(r.loyaltyPointsBurned),
  },
];

export function LoyaltyPanel({
  merchants,
  open,
  onOpenChange,
}: {
  merchants: Row[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <TypedAdoptionPanel
      title="Loyalty Setups"
      description="Loyalty program status and points activity, by merchant."
      rows={merchants}
      extraColumns={COLUMNS}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
