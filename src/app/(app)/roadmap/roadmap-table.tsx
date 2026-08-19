"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHead } from "@/components/sortable-head";
import { RoadmapStatusSelect } from "@/components/roadmap-status-select";
import { useSort } from "@/hooks/use-sort";
import type { SerializedRoadmapItem } from "@/lib/serialize";
import { RoadmapDetailSheet } from "./roadmap-detail-sheet";

function firstTicketLink(raw: string | null) {
  if (!raw) return null;
  return raw.match(/https?:\/\/\S+/)?.[0] ?? null;
}

const ACCESSORS = {
  title: (r: SerializedRoadmapItem) => r.title,
  theme: (r: SerializedRoadmapItem) => r.theme,
  status: (r: SerializedRoadmapItem) => r.status,
  design: (r: SerializedRoadmapItem) => r.design,
  goLiveDate: (r: SerializedRoadmapItem) => r.goLiveDate,
};

export function RoadmapTable({ rows }: { rows: SerializedRoadmapItem[] }) {
  const [selected, setSelected] = useState<SerializedRoadmapItem | null>(null);
  const { sorted, sortKey, direction, toggleSort } = useSort(rows, ACCESSORS);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead label="Title" sortKey="title" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Theme" sortKey="theme" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Status" sortKey="status" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Design" sortKey="design" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <TableHead className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ticket
            </TableHead>
            <SortableHead label="Go Live" sortKey="goLiveDate" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-12 text-center text-[13px] text-muted-foreground">
                No roadmap items match these filters.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((item) => {
              const ticket = firstTicketLink(item.ticketUrl);
              return (
                <TableRow key={item.id} onClick={() => setSelected(item)} className="cursor-pointer">
                  <TableCell className="max-w-xs px-4 py-3.5 text-[13px] font-medium text-foreground">
                    <p className="truncate">{item.title}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">{item.theme ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3.5">
                    <RoadmapStatusSelect id={item.id} status={item.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[13px] text-foreground">{item.design ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3.5">
                    {ticket ? (
                      <a
                        href={ticket}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[12px] text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
                      >
                        Ticket
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-[12px] text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">{item.goLiveDate ?? "—"}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <RoadmapDetailSheet item={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
