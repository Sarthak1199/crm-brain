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
import { Section } from "@/components/detail-panel";
import { formatDate } from "@/lib/format";
import { deleteTemplate, deleteTemplateApproval } from "./actions";
import { TemplateForm } from "./template-form";
import { AddApprovalForm } from "./add-approval-form";
import type { TemplateRow } from "./templates-table";

export function TemplateDetailSheet({
  row,
  merchants,
  onOpenChange,
}: {
  row: TemplateRow | null;
  merchants: { id: string; brandName: string; dotpeMid: string }[];
  onOpenChange: (open: boolean) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deletingApprovalId, setDeletingApprovalId] = useState<string | null>(null);

  function handleDelete() {
    if (!row) return;
    if (!window.confirm("Delete this template? Its merchant approvals will be removed too.")) return;
    startDelete(async () => {
      await deleteTemplate(row.id);
      onOpenChange(false);
    });
  }

  function handleDeleteApproval(approvalId: string) {
    if (!window.confirm("Remove this merchant approval?")) return;
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
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-[18px]">{row.channel}</SheetTitle>
                    <span className="text-[13px] text-muted-foreground">
                      {row.dealType === "WithDeal" ? "With Deal" : "Without Deal"}
                    </span>
                    {row.category ? (
                      <Badge variant="outline" className="text-[11px]">
                        {row.category}
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
                <SheetDescription>Created {formatDate(row.createdAt)}</SheetDescription>
              </SheetHeader>

              <div className="px-4">
                <Section title="Message">
                  <dd className="col-span-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                    {row.messageText}
                  </dd>
                </Section>

                <div className="py-5">
                  <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                    Merchant Approvals ({row.approvals.length})
                  </h3>

                  {row.approvals.length > 0 ? (
                    <div className="mb-3 flex flex-col gap-1.5">
                      {row.approvals.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-foreground">
                              {a.merchant.brandName}
                            </p>
                            <p className="truncate text-[12px] text-muted-foreground">
                              {a.merchant.dotpeMid} · Template ID: {a.providerTemplateId}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={deletingApprovalId === a.id}
                            onClick={() => handleDeleteApproval(a.id)}
                            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-negative/10 hover:text-negative-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-3 text-[13px] text-muted-foreground">
                      No merchants approved for this template yet.
                    </p>
                  )}

                  <AddApprovalForm templateId={row.id} merchants={merchants} />
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
          }}
          onSuccess={() => onOpenChange(false)}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  );
}
