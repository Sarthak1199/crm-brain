"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SortableHead } from "@/components/sortable-head";
import { formatDate } from "@/lib/format";
import { useSort } from "@/hooks/use-sort";
import { cn } from "@/lib/utils";
import { TemplateDetailSheet } from "./template-detail-sheet";
import { HANDLE_LABELS } from "./template-form";
import type { Channel, Category, DealType, Handle } from "./template-form";
import type { ExistingApproval } from "./approval-form";

export type ApprovalRow = ExistingApproval;

export type TemplateRow = {
  id: string;
  name: string | null;
  channel: Channel;
  dealType: DealType;
  category: Category | null;
  handle: Handle | null;
  requestedMid: string | null;
  eventId: string | null;
  isDefault: boolean;
  messageText: string;
  createdAt: string;
  // Still shown/managed in the detail sheet — only dropped from this list
  // view, not removed from the data model.
  approvals: ApprovalRow[];
};

const ACCESSORS = {
  name: (r: TemplateRow) => r.name ?? "",
  channel: (r: TemplateRow) => r.channel,
  dealType: (r: TemplateRow) => r.dealType,
  category: (r: TemplateRow) => r.category ?? "",
  handle: (r: TemplateRow) => (r.handle ? HANDLE_LABELS[r.handle] : ""),
  eventId: (r: TemplateRow) => r.eventId ?? "",
  isDefault: (r: TemplateRow) => (r.isDefault ? 1 : 0),
  createdAt: (r: TemplateRow) => new Date(r.createdAt),
};

function ChannelBadge({ channel }: { channel: Channel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium",
        channel === "WhatsApp"
          ? "border-positive/20 bg-positive/10 text-positive-foreground"
          : "border-primary/20 bg-primary/10 text-primary"
      )}
    >
      {channel}
    </span>
  );
}

export function TemplatesTable({ rows, canEdit }: { rows: TemplateRow[]; canEdit: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { sorted, sortKey, direction, toggleSort } = useSort(rows, ACCESSORS, {
    key: "createdAt",
    direction: "desc",
  });

  // Look the selected row up fresh from `rows` each render (rather than
  // holding a snapshot of the row object) so the open sheet reflects new
  // server data — e.g. a just-added approval — as soon as revalidatePath
  // refreshes this table, instead of showing stale approvals until re-opened.
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead label="Name" sortKey="name" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Channel" sortKey="channel" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Type" sortKey="dealType" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Category" sortKey="category" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Handle" sortKey="handle" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <TableHead className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Message
            </TableHead>
            <SortableHead label="Event ID" sortKey="eventId" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Default" sortKey="isDefault" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Created" sortKey="createdAt" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={9} className="py-12 text-center text-[13px] text-muted-foreground">
                No templates yet.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => (
              <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className="cursor-pointer">
                <TableCell className="px-4 py-3.5 text-[13px] font-medium text-foreground">
                  {row.name ?? <span className="text-[12px] font-normal text-muted-foreground/60">—</span>}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <ChannelBadge channel={row.channel} />
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-foreground">
                  {row.dealType === "WithDeal" ? "With Deal" : "Without Deal"}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  {row.category ? (
                    <Badge variant="outline" className="text-[11px]">
                      {row.category}
                    </Badge>
                  ) : (
                    <span className="text-[12px] text-muted-foreground/60">Uncategorized</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-foreground">
                  {row.handle ? HANDLE_LABELS[row.handle] : <span className="text-[12px] text-muted-foreground/60">—</span>}
                </TableCell>
                <TableCell className="max-w-sm px-4 py-3.5 text-[13px] text-foreground">
                  <p className="truncate">{row.messageText}</p>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">
                  {row.eventId ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  {row.isDefault ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-positive-foreground">
                      <Check className="size-3.5" />
                      Default
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] text-muted-foreground">
                  {formatDate(row.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TemplateDetailSheet row={selected} canEdit={canEdit} onOpenChange={(open) => !open && setSelectedId(null)} />
    </div>
  );
}
