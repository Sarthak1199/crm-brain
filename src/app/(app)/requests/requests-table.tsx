"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHead } from "@/components/sortable-head";
import { formatNumber, formatInr, formatDate, formatPercent } from "@/lib/format";
import { useSort } from "@/hooks/use-sort";
import { cn } from "@/lib/utils";
import type { SerializedSupportRequest } from "@/lib/serialize";
import { RequestDetailSheet } from "./request-detail-sheet";

// merchant is null for requests filed against a name typed in fresh (not
// yet a real Merchant row) — merchantNameFreeText carries the typed name
// in that case, from SerializedSupportRequest.
export type RequestRow = SerializedSupportRequest & {
  merchant: {
    id: string;
    brandName: string;
    dotpeMid: string;
    totalStores: number;
    closedBranches: number;
    totalYearlyPotential: number;
  } | null;
};

function merchantName(r: RequestRow) {
  return r.merchant?.brandName ?? r.merchantNameFreeText ?? "—";
}

// Outlet closed / total no. of outlets, from the "CRM+Loyalty closures"
// GSheet tab (synced onto Merchant.closedBranches/totalStores). No
// denominator means the merchant's outlet count hasn't been captured in
// that sheet yet, not a real 0% — surfaced as "—", not "0%".
function closurePercent(r: RequestRow): number | null {
  if (!r.merchant || r.merchant.totalStores <= 0) return null;
  return r.merchant.closedBranches / r.merchant.totalStores;
}

const ACCESSORS = {
  brandName: (r: RequestRow) => merchantName(r),
  dotpeMid: (r: RequestRow) => r.merchant?.dotpeMid ?? "",
  type: (r: RequestRow) => r.type,
  totalBranches: (r: RequestRow) => r.totalBranches,
  closurePercent: (r: RequestRow) => closurePercent(r),
  merchantPotential: (r: RequestRow) => r.merchant?.totalYearlyPotential ?? null,
  totalPotential: (r: RequestRow) => r.totalPotential,
  createdAt: (r: RequestRow) => new Date(r.createdAt),
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium",
        type === "Bug"
          ? "border-negative/20 bg-negative/10 text-negative-foreground"
          : "border-primary/20 bg-primary/10 text-primary"
      )}
    >
      {type}
    </span>
  );
}

type MerchantOption = { id: string; brandName: string; totalStores: number; totalYearlyPotential: number };

export function RequestsTable({
  rows,
  merchants,
  canEdit,
}: {
  rows: RequestRow[];
  merchants: MerchantOption[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const { sorted, sortKey, direction, toggleSort } = useSort(rows, ACCESSORS, {
    key: "createdAt",
    direction: "desc",
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead label="Merchant" sortKey="brandName" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="MID" sortKey="dotpeMid" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Type" sortKey="type" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <TableHead className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Files
            </TableHead>
            <SortableHead label="Total Loyalty Branches" sortKey="totalBranches" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="% Closed" sortKey="closurePercent" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="Total Potential" sortKey="merchantPotential" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="Pending Potential" sortKey="totalPotential" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
            <SortableHead label="Created" sortKey="createdAt" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={10} className="py-12 text-center text-[13px] text-muted-foreground">
                No requests yet.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => (
              <TableRow key={row.id} onClick={() => setSelected(row)} className="cursor-pointer">
                <TableCell className="px-4 py-3.5 text-[13px] font-medium text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    {merchantName(row)}
                    {!row.merchant ? (
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        New
                      </span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">
                  {row.merchant?.dotpeMid ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <TypeBadge type={row.type} />
                </TableCell>
                <TableCell className="max-w-xs px-4 py-3.5 text-[13px] text-foreground">
                  {/* line-clamp instead of a single truncated line — some
                      descriptions pack several numbered items into one
                      block of text rather than using "Add another
                      request", and a single line hid that entirely. */}
                  <p className="line-clamp-2 whitespace-pre-line">{row.description}</p>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  {row.images.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                      <ImageIcon className="size-3.5" />
                      {row.images.length}
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatNumber(row.totalBranches)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatPercent(closurePercent(row))}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {row.merchant ? formatInr(row.merchant.totalYearlyPotential, { compact: true }) : "—"}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-foreground">
                  {formatInr(row.totalPotential, { compact: true })}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-muted-foreground">
                  {formatDate(row.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <RequestDetailSheet
        row={selected}
        merchants={merchants}
        canEdit={canEdit}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
