"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SortableHead } from "@/components/sortable-head";
import { StatusBadge } from "@/components/status-badge";
import { formatNumber } from "@/lib/format";
import { useSort } from "@/hooks/use-sort";

export type OnboardingMerchantRow = {
  id: string;
  brandName: string;
  dotpeMid: string;
  totalStores: number;
  crmStatus: string;
  loyaltyStatus: string;
  wabaStatus: string;
  ristaStatus: string;
  dotpeStatus: string;
};

const ACCESSORS = {
  brandName: (r: OnboardingMerchantRow) => r.brandName,
  dotpeMid: (r: OnboardingMerchantRow) => r.dotpeMid,
  totalStores: (r: OnboardingMerchantRow) => r.totalStores,
  crmStatus: (r: OnboardingMerchantRow) => r.crmStatus,
  loyaltyStatus: (r: OnboardingMerchantRow) => r.loyaltyStatus,
  wabaStatus: (r: OnboardingMerchantRow) => r.wabaStatus,
  ristaStatus: (r: OnboardingMerchantRow) => r.ristaStatus,
  dotpeStatus: (r: OnboardingMerchantRow) => r.dotpeStatus,
};

export function OnboardingDetailsTable({ rows }: { rows: OnboardingMerchantRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.brandName.toLowerCase().includes(q));
  }, [rows, query]);
  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, ACCESSORS, {
    key: "brandName",
    direction: "asc",
  });

  return (
    <div>
      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search merchant name..."
          className="h-9 rounded-lg pl-8 text-[13px]"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead label="Brand Name" sortKey="brandName" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="MID" sortKey="dotpeMid" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Branch Size" sortKey="totalStores" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="Rista" sortKey="ristaStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="DotPe" sortKey="dotpeStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="WABA" sortKey="wabaStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="CRM License" sortKey="crmStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Loyalty License" sortKey="loyaltyStatus" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-12 text-center text-[13px] text-muted-foreground">
                {rows.length === 0 ? "No merchants yet." : "No merchants match that search."}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/40">
                <TableCell className="px-4 py-3.5 text-[13px] font-medium text-foreground">
                  {row.brandName}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">{row.dotpeMid}</TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatNumber(row.totalStores)}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.ristaStatus} />
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.dotpeStatus} />
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.wabaStatus} />
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.crmStatus} />
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <StatusBadge value={row.loyaltyStatus} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
