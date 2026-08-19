"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
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

export function RequestDetailSheet({
  row,
  merchants,
  onOpenChange,
}: {
  row: RequestRow | null;
  merchants: MerchantOption[];
  onOpenChange: (open: boolean) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!row) return;
    if (!window.confirm(`Delete this ${row.type.toLowerCase()} request for ${row.merchant.brandName}?`)) return;
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
                    <SheetTitle className="text-[18px]">{row.merchant.brandName}</SheetTitle>
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
                  {row.merchant.dotpeMid} · Filed {formatDate(row.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4">
                <Section title="Snapshot">
                  <Field label="Total Branches" value={formatNumber(row.totalBranches)} />
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
                      Images ({row.images.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {row.images.map((src) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={src} href={src} target="_blank" rel="noreferrer">
                          <img
                            src={src}
                            alt=""
                            className="aspect-square w-full rounded-lg border border-border object-cover"
                          />
                        </a>
                      ))}
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
            merchantId: row.merchant.id,
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
