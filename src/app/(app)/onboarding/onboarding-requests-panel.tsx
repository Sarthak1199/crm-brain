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
import { formatDate } from "@/lib/format";

export type OnboardingRequestRow = {
  id: string;
  businessName: string | null;
  enterpriseMerchantId: string | null;
  loyaltyType: string | null;
  crmLicenseRequested: boolean;
  loyaltyEnabled: boolean;
  crmEnabled: boolean;
  timestamp: string | null;
  createdViaPlatform: boolean;
};

const ACCESSORS = {
  businessName: (r: OnboardingRequestRow) => r.businessName,
  enterpriseMerchantId: (r: OnboardingRequestRow) => r.enterpriseMerchantId,
  loyaltyType: (r: OnboardingRequestRow) => r.loyaltyType,
  loyaltyEnabled: (r: OnboardingRequestRow) => (r.loyaltyEnabled ? 1 : 0),
  crmEnabled: (r: OnboardingRequestRow) => (r.crmEnabled ? 1 : 0),
  timestamp: (r: OnboardingRequestRow) => (r.timestamp ? new Date(r.timestamp) : null),
};

function YesNo({ value }: { value: boolean }) {
  return (
    <span
      className={
        value
          ? "inline-flex items-center rounded-full border border-positive/20 bg-positive/10 px-2 py-0.5 text-[12px] font-medium text-positive-foreground"
          : "inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[12px] font-medium text-muted-foreground"
      }
    >
      {value ? "Enabled" : "Pending"}
    </span>
  );
}

export function OnboardingRequestsPanel({
  requests,
  open,
  onOpenChange,
}: {
  requests: OnboardingRequestRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => (r.businessName ?? "").toLowerCase().includes(q));
  }, [requests, query]);

  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, ACCESSORS, {
    key: "timestamp",
    direction: "desc",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-[18px]">Onboarding Requests</SheetTitle>
          <SheetDescription>Every row raised via this form or the original Google Form.</SheetDescription>
        </SheetHeader>

        <div className="p-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search business name..."
              className="h-9 rounded-lg pl-8 text-[13px]"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead label="Business" sortKey="businessName" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="MID" sortKey="enterpriseMerchantId" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="Loyalty Type" sortKey="loyaltyType" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="Loyalty" sortKey="loyaltyEnabled" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="CRM" sortKey="crmEnabled" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="Submitted" sortKey="timestamp" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="py-10 text-center text-[13px] text-muted-foreground">
                      No matches.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell className="px-4 py-3 text-[13px] font-medium text-foreground">
                        {r.businessName ?? "—"}
                        {r.createdViaPlatform ? (
                          <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            via platform
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] text-muted-foreground">
                        {r.enterpriseMerchantId ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] text-muted-foreground">
                        {r.loyaltyType ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <YesNo value={r.loyaltyEnabled} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {r.crmLicenseRequested ? <YesNo value={r.crmEnabled} /> : <span className="text-[12px] text-muted-foreground/60">Not requested</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-[13px] text-muted-foreground">
                        {formatDate(r.timestamp)}
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
