"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SortableHead } from "@/components/sortable-head";
import { RoadmapStatusSelect } from "@/components/roadmap-status-select";
import { useSort } from "@/hooks/use-sort";
import { parseTicketLinks } from "@/lib/roadmap-status";
import type { SerializedRoadmapItem } from "@/lib/serialize";
import { RoadmapDetailSheet } from "./roadmap-detail-sheet";

const ACCESSORS = {
  title: (r: SerializedRoadmapItem) => r.title,
  theme: (r: SerializedRoadmapItem) => r.theme,
  status: (r: SerializedRoadmapItem) => r.status,
  design: (r: SerializedRoadmapItem) => r.design,
  goLiveDate: (r: SerializedRoadmapItem) => r.goLiveDate,
};

// Client-side substring match against the fields most likely to hold the
// text someone's searching for — title/theme/status first (also visible
// columns), then the free-text brief fields (description/why/brandSignal)
// that only show up once a row is opened.
const SEARCH_FIELDS: (keyof SerializedRoadmapItem)[] = [
  "title",
  "theme",
  "status",
  "description",
  "why",
  "brandSignal",
];

function matchesSearch(item: SerializedRoadmapItem, query: string): boolean {
  return SEARCH_FIELDS.some((field) => {
    const value = item[field];
    return typeof value === "string" && value.toLowerCase().includes(query);
  });
}

export function RoadmapTable({ rows, canEdit }: { rows: SerializedRoadmapItem[]; canEdit: boolean }) {
  const [selected, setSelected] = useState<SerializedRoadmapItem | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => matchesSearch(item, q));
  }, [rows, query]);

  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, ACCESSORS);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, theme, status, or brief..."
            className="h-9 rounded-lg pl-8 text-[13px]"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
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
                No roadmap items match these filters{query ? " or search" : ""}.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((item) => {
              const tickets = parseTicketLinks(item.ticketUrl);
              return (
                <TableRow key={item.id} onClick={() => setSelected(item)} className="cursor-pointer">
                  <TableCell className="max-w-xs px-4 py-3.5 text-[13px] font-medium text-foreground">
                    <p className="truncate">{item.title}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">{item.theme ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3.5">
                    <RoadmapStatusSelect id={item.id} status={item.status} canEdit={canEdit} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[13px] text-foreground">{item.design ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3.5">
                    {tickets.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {tickets.map((t) => (
                          <a
                            key={t.url}
                            href={t.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[12px] text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
                          >
                            {t.number}
                            <ExternalLink className="size-3" />
                          </a>
                        ))}
                      </div>
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
      </div>

      <RoadmapDetailSheet item={selected} canEdit={canEdit} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
