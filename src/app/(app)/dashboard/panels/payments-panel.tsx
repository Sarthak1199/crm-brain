"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead } from "@/components/sortable-head";
import { useSort } from "@/hooks/use-sort";
import { formatInr, formatNumber, formatDate } from "@/lib/format";
import type { SerializedMerchant } from "@/lib/serialize";

type Row = Pick<SerializedMerchant, "id" | "brandName" | "dotpeMid" | "paymentCollected" | "paymentCollectedDate" | "closedBranches">;

const ACCESSORS = {
  brandName: (r: Row) => r.brandName,
  dotpeMid: (r: Row) => r.dotpeMid,
  paymentCollected: (r: Row) => r.paymentCollected,
  paymentCollectedDate: (r: Row) => (r.paymentCollectedDate ? new Date(r.paymentCollectedDate) : null),
  closedBranches: (r: Row) => r.closedBranches,
};

export function PaymentsPanel({
  merchants,
  open,
  onOpenChange,
}: {
  merchants: Row[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merchants;
    return merchants.filter((m) => m.brandName.toLowerCase().includes(q));
  }, [merchants, query]);

  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, ACCESSORS, {
    key: "paymentCollected",
    direction: "desc",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-[18px]">Payments</SheetTitle>
          <SheetDescription>Payment collected and paid branches, by merchant.</SheetDescription>
        </SheetHeader>

        <div className="p-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant name..."
              className="h-9 rounded-lg pl-8 text-[13px]"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead label="Brand Name" sortKey="brandName" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="MID" sortKey="dotpeMid" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="Payment Collected" sortKey="paymentCollected" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                  <SortableHead label="Collected Date" sortKey="paymentCollectedDate" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                  <SortableHead label="Paid Branches" sortKey="closedBranches" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="py-10 text-center text-[13px] text-muted-foreground">
                      No matches.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/40">
                      <TableCell className="px-4 py-3 text-[13px] font-medium text-foreground">{m.brandName}</TableCell>
                      <TableCell className="px-4 py-3 text-[13px] text-muted-foreground">{m.dotpeMid}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-[13px] text-foreground">
                        {formatInr(m.paymentCollected, { compact: true })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-[13px] text-muted-foreground">
                        {formatDate(m.paymentCollectedDate)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-[13px] text-foreground">
                        {formatNumber(m.closedBranches)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
