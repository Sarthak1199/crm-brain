"use client";

import { useState } from "react";
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
import type { ApprovalStatus, ExistingApproval } from "./approval-form";

export type ApprovalRow = ExistingApproval;

export type TemplateRow = {
  id: string;
  channel: Channel;
  dealType: DealType;
  category: Category | null;
  handle: Handle | null;
  requestedMid: string | null;
  messageText: string;
  createdAt: string;
  approvals: ApprovalRow[];
};

const ACCESSORS = {
  channel: (r: TemplateRow) => r.channel,
  dealType: (r: TemplateRow) => r.dealType,
  category: (r: TemplateRow) => r.category ?? "",
  handle: (r: TemplateRow) => (r.handle ? HANDLE_LABELS[r.handle] : ""),
  approvals: (r: TemplateRow) => r.approvals.length,
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

function bestApprovalStatus(approvals: ApprovalRow[]): ApprovalStatus | null {
  if (approvals.some((a) => a.approvalStatus === "Approved")) return "Approved";
  if (approvals.length > 0) return "Submitted";
  return null;
}

export function TemplatesTable({ rows }: { rows: TemplateRow[] }) {
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
            <SortableHead label="Channel" sortKey="channel" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Type" sortKey="dealType" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Category" sortKey="category" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Handle" sortKey="handle" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <TableHead className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Message
            </TableHead>
            <SortableHead label="Approval" sortKey="approvals" activeSortKey={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHead label="Created" sortKey="createdAt" activeSortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-12 text-center text-[13px] text-muted-foreground">
                No templates yet.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => {
              const status = bestApprovalStatus(row.approvals);
              return (
                <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className="cursor-pointer">
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
                  <TableCell className="px-4 py-3.5">
                    {status ? (
                      <Badge
                        variant="outline"
                        className={
                          status === "Approved"
                            ? "border-positive/20 bg-positive/10 text-[11px] text-positive-foreground"
                            : "text-[11px] text-muted-foreground"
                        }
                      >
                        {status}
                      </Badge>
                    ) : (
                      <span className="text-[12px] text-muted-foreground/60">None</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right text-[13px] text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <TemplateDetailSheet row={selected} onOpenChange={(open) => !open && setSelectedId(null)} />
    </div>
  );
}
