"use client";

import { formatNumber } from "@/lib/format";
import type { SerializedMerchant } from "@/lib/serialize";
import { TypedAdoptionPanel, type ExtraColumn } from "./typed-adoption-panel";

type Row = Pick<
  SerializedMerchant,
  "id" | "brandName" | "dotpeMid" | "totalStores" | "campaignsSetup" | "campaignsUsingRfm" | "campaignsContactsReached"
>;

const COLUMNS: ExtraColumn<Row>[] = [
  {
    key: "campaignsSetup",
    label: "Campaigns Setup",
    align: "right",
    accessor: (r) => r.campaignsSetup,
    render: (r) => formatNumber(r.campaignsSetup),
  },
  {
    key: "campaignsUsingRfm",
    label: "RFM Sent",
    align: "right",
    accessor: (r) => r.campaignsUsingRfm,
    render: (r) => formatNumber(r.campaignsUsingRfm),
  },
  {
    key: "campaignsContactsReached",
    label: "Customers Reached",
    align: "right",
    accessor: (r) => r.campaignsContactsReached,
    render: (r) => formatNumber(r.campaignsContactsReached),
  },
];

export function CampaignPanel({
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
      title="RFM Campaigns Sent"
      description="Campaign setup and RFM-based sends, by merchant."
      rows={merchants}
      extraColumns={COLUMNS}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
