"use client";

import { formatNumber } from "@/lib/format";
import { automationRuleLabel } from "@/lib/automation-rule-labels";
import type { SerializedMerchant } from "@/lib/serialize";
import { TypedAdoptionPanel, type ExtraColumn } from "./typed-adoption-panel";

type Row = Pick<
  SerializedMerchant,
  "id" | "brandName" | "dotpeMid" | "totalStores" | "automationsRules" | "automationsTotalSent" | "customerCount"
>;

function ruleNames(rules: unknown): string[] {
  return Array.isArray(rules) ? (rules as string[]).map(automationRuleLabel) : [];
}

const COLUMNS: ExtraColumn<Row>[] = [
  {
    key: "automationsRules",
    label: "Rule Names",
    accessor: (r) => ruleNames(r.automationsRules).join(", "),
    render: (r) => {
      const names = ruleNames(r.automationsRules);
      return names.length > 0 ? names.join(", ") : "—";
    },
  },
  {
    key: "automationsTotalSent",
    label: "Total Sent",
    align: "right",
    accessor: (r) => r.automationsTotalSent,
    render: (r) => formatNumber(r.automationsTotalSent),
  },
  {
    key: "customerCount",
    label: "Customer Count",
    align: "right",
    accessor: (r) => r.customerCount,
    render: (r) => formatNumber(r.customerCount),
  },
];

export function AutomationPanel({
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
      title="Automation Setups"
      description="Active automation rules and reach, by merchant."
      rows={merchants}
      extraColumns={COLUMNS}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
