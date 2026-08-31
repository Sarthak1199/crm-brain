"use client";

import { useState, useTransition } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Section, Field } from "@/components/detail-panel";
import { formatDate, formatInr, formatNumber } from "@/lib/format";
import { deleteSupportRequest } from "./actions";
import { RequestForm } from "./request-form";
import type { RequestRow } from "./requests-table";

type MerchantOption = { id: string; brandName: string; totalStores: number; totalYearlyPotential: number };

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

function isImagePath(src: string) {
  return IMAGE_EXTENSIONS.some((ext) => src.toLowerCase().endsWith(ext));
}

function fileNameFromPath(src: string) {
  return src.split("/").pop() ?? src;
}

export function RequestDetailSheet({
  row,
  merchants,
  canEdit,
  onOpenChange,
}: {
  row: RequestRow | null;
  merchants: MerchantOption[];
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!row) return;
    const name = row.merchant?.brandName ?? row.merchantNameFreeText ?? "this merchant";
    if (!window.confirm(`Delete this ${row.type.toLowerCase()} request for ${name}?`)) return;
    startDelete(async () => {
      await deleteSupportRequest(row.id);
      onOpenChange(false);
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
                    <SheetTitle className="text-[18px]">
                      {row.merchant?.brandName ?? row.merchantNameFreeText ?? "Unknown merchant"}
                    </SheetTitle>
                    <span
                      className={
                        row.type === "Bug"
                          ? "inline-flex items-center rounded-full border border-negative/20 bg-negative/10 px-2 py-0.5 text-[12px] font-medium text-negative-foreground"
                          : "inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[12px] font-medium text-primary"
                      }
                    >
                      {row.type}
                    </span>
                  </div>
                  {canEdit ? (
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
                  ) : null}
                </div>
                <SheetDescription>
                  {row.merchant?.dotpeMid ?? "New merchant"} · Filed {formatDate(row.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4">
                <Section title="Snapshot">
                  <Field label="Total Loyalty Branches" value={formatNumber(row.totalBranches)} />
                  <Field label="Total Potential" value={formatInr(row.totalPotential)} />
                </Section>

                <Section title="Description">
                  <dd className="col-span-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                    {row.description}
                  </dd>
                </Section>

                {row.productRemarks ? (
                  <Section title="Product Remarks">
                    <dd className="col-span-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                      {row.productRemarks}
                    </dd>
                  </Section>
                ) : null}

                {row.images.length > 0 ? (
                  <div className="py-5">
                    <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                      Files ({row.images.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {row.images.map((src) =>
                        isImagePath(src) ? (
                          <a key={src} href={src} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt=""
                              className="aspect-square w-full rounded-lg border border-border object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            key={src}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 p-2 text-center hover:bg-muted/70"
                          >
                            <FileText className="size-6 text-muted-foreground" />
                            <span className="line-clamp-2 break-all text-[10px] leading-tight text-muted-foreground">
                              {fileNameFromPath(src)}
                            </span>
                          </a>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {row ? (
        <RequestForm
          merchants={merchants}
          existing={{
            id: row.id,
            merchantId: row.merchant?.id ?? null,
            merchantNameFreeText: row.merchantNameFreeText,
            type: row.type,
            description: row.description,
            totalBranches: row.totalBranches,
            totalPotential: row.totalPotential,
            productRemarks: row.productRemarks,
            images: row.images,
          }}
          onSuccess={() => onOpenChange(false)}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  );
}
