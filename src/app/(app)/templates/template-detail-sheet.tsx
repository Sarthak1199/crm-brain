"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Section } from "@/components/detail-panel";
import { formatDate } from "@/lib/format";
import { deleteTemplate, deleteTemplateApproval } from "./actions";
import { TemplateForm, HANDLE_LABELS } from "./template-form";
import { ApprovalForm } from "./approval-form";
import type { TemplateRow } from "./templates-table";

function ApprovalStatusBadge({ status }: { status: "Submitted" | "Approved" }) {
  return (
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
  );
}

export function TemplateDetailSheet({
  row,
  onOpenChange,
}: {
  row: TemplateRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editingApprovalId, setEditingApprovalId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [deletingApprovalId, setDeletingApprovalId] = useState<string | null>(null);

  function handleDelete() {
    if (!row) return;
    if (!window.confirm("Delete this template? Its approval submissions will be removed too.")) return;
    startDelete(async () => {
      await deleteTemplate(row.id);
      onOpenChange(false);
    });
  }

  function handleDeleteApproval(approvalId: string) {
    if (!window.confirm("Remove this approval submission?")) return;
    setDeletingApprovalId(approvalId);
    startDelete(async () => {
      await deleteTemplateApproval(approvalId);
      setDeletingApprovalId(null);
    });
  }

  return (
    <>
      <Sheet open={!!row} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-xl">
          {row ? (
            <>
              <SheetHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle className="text-[18px]">{row.channel}</SheetTitle>
                    <span className="text-[13px] text-muted-foreground">
                      {row.dealType === "WithDeal" ? "With Deal" : "Without Deal"}
                    </span>
                    {row.category ? (
                      <Badge variant="outline" className="text-[11px]">
                        {row.category}
                      </Badge>
                    ) : null}
                    {row.handle ? (
                      <Badge variant="outline" className="text-[11px]">
                        {HANDLE_LABELS[row.handle]}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mr-6 flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 rounded-md text-[12px]"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="size-3" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDeleting}
                      className="h-7 gap-1 rounded-md text-[12px] text-negative-foreground hover:bg-negative/10"
                      onClick={handleDelete}
                    >
                      <Trash2 className="size-3" />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
                <SheetDescription>
                  Created {formatDate(row.createdAt)}
                  {row.requestedMid ? ` · Requested MID: ${row.requestedMid}` : ""}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4">
                <Section title="Message" action={<CopyButton text={row.messageText} />}>
                  <dd className="col-span-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                    {row.messageText}
                  </dd>
                </Section>

                <div className="py-5">
                  <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                    Approval Submissions ({row.approvals.length})
                  </h3>

                  {row.approvals.length > 0 ? (
                    <div className="mb-3 flex flex-col gap-1.5">
                      {row.approvals.map((a) =>
                        editingApprovalId === a.id ? (
                          <ApprovalForm
                            key={a.id}
                            templateId={row.id}
                            existing={a}
                            onSuccess={() => setEditingApprovalId(null)}
                            onCancel={() => setEditingApprovalId(null)}
                          />
                        ) : (
                          <div
                            key={a.id}
                            className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/40"
                            onClick={() => setEditingApprovalId(a.id)}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <ApprovalStatusBadge status={a.approvalStatus} />
                              <p className="truncate text-[12px] text-muted-foreground">
                                {[a.eventId ? `Event: ${a.eventId}` : null, a.providerTemplateId ? `Template ID: ${a.providerTemplateId}` : null]
                                  .filter(Boolean)
                                  .join(" · ") || "No IDs recorded yet"}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={deletingApprovalId === a.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteApproval(a.id);
                              }}
                              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-negative/10 hover:text-negative-foreground"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="mb-3 text-[13px] text-muted-foreground">No approval submissions yet.</p>
                  )}

                  <ApprovalForm templateId={row.id} />
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {row ? (
        <TemplateForm
          existing={{
            id: row.id,
            channel: row.channel,
            dealType: row.dealType,
            messageText: row.messageText,
            category: row.category,
            requestedMid: row.requestedMid,
            handle: row.handle,
          }}
          onSuccess={() => onOpenChange(false)}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  );
}
