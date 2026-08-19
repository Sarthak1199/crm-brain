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
import { formatNumber } from "@/lib/format";

export type CommonAdoptionRow = {
  id: string;
  brandName: string;
  dotpeMid: string;
  totalStores: number;
};

export type ExtraColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  accessor: (row: T) => string | number | null;
  render: (row: T) => React.ReactNode;
};

export function TypedAdoptionPanel<T extends CommonAdoptionRow>({
  title,
  description,
  rows,
  extraColumns,
  defaultSortKey = "brandName",
  open,
  onOpenChange,
}: {
  title: string;
  description: string;
  rows: T[];
  extraColumns: ExtraColumn<T>[];
  defaultSortKey?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.brandName.toLowerCase().includes(q));
  }, [rows, query]);

  const accessors = useMemo(() => {
    const base: Record<string, (r: T) => string | number | null> = {
      brandName: (r) => r.brandName,
      dotpeMid: (r) => r.dotpeMid,
      totalStores: (r) => r.totalStores,
    };
    for (const col of extraColumns) base[col.key] = col.accessor;
    return base;
  }, [extraColumns]);

  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, accessors, {
    key: defaultSortKey,
    direction: "asc",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-[18px]">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
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
                  <SortableHead label="Branches" sortKey="totalStores" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                  {extraColumns.map((col) => (
                    <SortableHead
                      key={col.key}
                      label={col.label}
                      sortKey={col.key}
                      activeSortKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                      align={col.align}
                    />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3 + extraColumns.length} className="py-10 text-center text-[13px] text-muted-foreground">
                      No matches.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/40">
                      <TableCell className="px-4 py-3 text-[13px] font-medium text-foreground">{row.brandName}</TableCell>
                      <TableCell className="px-4 py-3 text-[13px] text-muted-foreground">{row.dotpeMid}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-[13px] text-foreground">
                        {formatNumber(row.totalStores)}
                      </TableCell>
                      {extraColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={
                            col.align === "right"
                              ? "px-4 py-3 text-right text-[13px] text-foreground"
                              : "px-4 py-3 text-[13px] text-foreground"
                          }
                        >
                          {col.render(row)}
                        </TableCell>
                      ))}
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
