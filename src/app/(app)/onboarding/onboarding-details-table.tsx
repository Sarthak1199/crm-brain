"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHead } from "@/components/sortable-head";
import { StatusBadge } from "@/components/status-badge";
import { formatNumber } from "@/lib/format";
import { useSort } from "@/hooks/use-sort";

export type OnboardingMerchantRow = {
  id: string;
  brandName: string;
  totalStores: number;
  crmStatus: string;
  loyaltyStatus: string;
  wabaStatus: string;
};

const ACCESSORS = {
  brandName: (r: OnboardingMerchantRow) => r.brandName,
  totalStores: (r: OnboardingMerchantRow) => r.totalStores,
  crmStatus: (r: OnboardingMerchantRow) => r.crmStatus,
  loyaltyStatus: (r: OnboardingMerchantRow) => r.loyaltyStatus,
  wabaStatus: (r: OnboardingMerchantRow) => r.wabaStatus,
};

export function OnboardingDetailsTable({ rows }: { rows: OnboardingMerchantRow[] }) {
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
            <SortableHead label="Branch Size" sortKey="totalStores" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="CRM License" sortKey="crmStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Loyalty License" sortKey="loyaltyStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Marketing License" sortKey="wabaStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-12 text-center text-[13px] text-muted-foreground">
                No merchants yet.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/40">
                <TableCell className="px-4 py-3.5 text-[13px] font-medium text-foreground">
                  {row.brandName}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatNumber(row.totalStores)}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.crmStatus} />
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.loyaltyStatus} />
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.wabaStatus} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
