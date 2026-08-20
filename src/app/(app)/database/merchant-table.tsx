"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHead } from "@/components/sortable-head";
import { StatusBadge } from "@/components/status-badge";
import { formatInr, formatNumber } from "@/lib/format";
import { useSort } from "@/hooks/use-sort";
import type { SerializedMerchant, SerializedSnapshot } from "@/lib/serialize";
import { MerchantDetailSheet } from "./merchant-detail-sheet";

export type MerchantRow = {
  merchant: SerializedMerchant;
  snapshots: SerializedSnapshot[];
  loyaltyLicensed: boolean;
};

const ACCESSORS = {
  brandName: (r: MerchantRow) => r.merchant.brandName,
  dotpeMid: (r: MerchantRow) => r.merchant.dotpeMid,
  crmStatus: (r: MerchantRow) => r.merchant.crmStatus,
  loyaltyLicensed: (r: MerchantRow) => (r.loyaltyLicensed ? "Active" : "Inactive"),
  onboarded: (r: MerchantRow) => r.merchant.onboarded,
  paidBranches: (r: MerchantRow) => r.merchant.paidBranches,
  totalStores: (r: MerchantRow) => r.merchant.totalStores,
  subscriptionRevenue: (r: MerchantRow) => r.merchant.subscriptionRevenue,
  creditConsumedL30: (r: MerchantRow) => r.merchant.creditConsumedL30,
  customerCount: (r: MerchantRow) => r.merchant.customerCount,
};

export function MerchantTable({ rows }: { rows: MerchantRow[] }) {
  const [selected, setSelected] = useState<MerchantRow | null>(null);
  const { sorted, sortKey, direction, toggleSort } = useSort(rows, ACCESSORS, {
    key: "brandName",
    direction: "asc",
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead label="Brand Name" sortKey="brandName" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="MID" sortKey="dotpeMid" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="CRM License" sortKey="crmStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Loyalty License" sortKey="loyaltyLicensed" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Onboarded" sortKey="onboarded" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Paid Branches" sortKey="paidBranches" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="Total Stores" sortKey="totalStores" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="Subscription Rev." sortKey="subscriptionRevenue" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="Credits (L30)" sortKey="creditConsumedL30" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="Customer Count" sortKey="customerCount" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={10} className="py-12 text-center text-[13px] text-muted-foreground">
                No merchants match these filters.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => (
              <TableRow
                key={row.merchant.id}
                onClick={() => setSelected(row)}
                className="cursor-pointer"
              >
                <TableCell className="px-4 py-3.5 text-[13px] font-medium text-foreground">
                  {row.merchant.brandName}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">
                  {row.merchant.dotpeMid}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.merchant.crmStatus} />
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.loyaltyLicensed ? "Active" : "Inactive"} />
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.merchant.onboarded} />
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatNumber(row.merchant.paidBranches)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatNumber(row.merchant.totalStores)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatInr(row.merchant.subscriptionRevenue)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatInr(row.merchant.creditConsumedL30)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatNumber(row.merchant.customerCount)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <MerchantDetailSheet row={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
