"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead } from "@/components/sortable-head";
import { RoadmapStatusSelect } from "@/components/roadmap-status-select";
import { useSort } from "@/hooks/use-sort";
import type { SerializedRoadmapItem } from "@/lib/serialize";

function firstTicketLink(raw: string | null) {
  if (!raw) return null;
  return raw.match(/https?:\/\/\S+/)?.[0] ?? null;
}

const ACCESSORS = {
  title: (r: SerializedRoadmapItem) => r.title,
  theme: (r: SerializedRoadmapItem) => r.theme,
  status: (r: SerializedRoadmapItem) => r.status,
  goLiveDate: (r: SerializedRoadmapItem) => r.goLiveDate,
};

export function RoadmapPanel({
  items,
  canEdit,
  open,
  onOpenChange,
}: {
  items: SerializedRoadmapItem[];
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.title.toLowerCase().includes(q));
  }, [items, query]);

  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, ACCESSORS, {
    key: "status",
    direction: "asc",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-[18px]">Product Roadmap</SheetTitle>
          <SheetDescription>Change status inline — updates the Roadmap page too.</SheetDescription>
        </SheetHeader>

        <div className="p-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title..."
              className="h-9 rounded-lg pl-8 text-[13px]"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead label="Title" sortKey="title" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="Theme" sortKey="theme" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableHead label="Status" sortKey="status" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Ticket
                  </TableHead>
                  <SortableHead label="Go Live" sortKey="goLiveDate" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
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
                  sorted.map((item) => {
                    const ticket = firstTicketLink(item.ticketUrl);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell className="max-w-[220px] px-4 py-3 text-[13px] font-medium text-foreground">
                          <p className="truncate">{item.title}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-[13px] text-muted-foreground">{item.theme ?? "—"}</TableCell>
                        <TableCell className="px-4 py-3">
                          <RoadmapStatusSelect id={item.id} status={item.status} canEdit={canEdit} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {ticket ? (
                            <a
                              href={ticket}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
                            >
                              Ticket
                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-[12px] text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-[13px] text-muted-foreground">{item.goLiveDate ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
