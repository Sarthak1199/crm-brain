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
import { RoadmapStatusSelect } from "@/components/roadmap-status-select";
import { parseTicketLinks } from "@/lib/roadmap-status";
import { deleteRoadmapTicket } from "./actions";
import { RoadmapTicketForm } from "./roadmap-ticket-form";
import type { SerializedRoadmapItem } from "@/lib/serialize";

export function RoadmapDetailSheet({
  item,
  onOpenChange,
}: {
  item: SerializedRoadmapItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const tickets = parseTicketLinks(item?.ticketUrl ?? null);

  function handleDelete() {
    if (!item) return;
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    startDelete(async () => {
      await deleteRoadmapTicket(item.id);
      onOpenChange(false);
    });
  }

  return (
    <>
      <Sheet open={!!item} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-xl">
          {item ? (
            <>
              <SheetHeader className="border-b border-border pb-4">
                <div className="flex items-start justify-between gap-2">
                  <SheetTitle className="text-[18px]">{item.title}</SheetTitle>
                  {item.isManual ? (
                    <div className="mr-6 flex shrink-0 items-center gap-1.5">
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
                  {item.theme ?? "Unthemed"}
                  {item.isManual ? " · Manually created" : null}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4">
                <Section title="Status">
                  <Field label="Status" value={<RoadmapStatusSelect id={item.id} status={item.status} />} />
                  <Field label="Priority" value={item.priority} />
                  <Field label="USP" value={item.usp ? "Yes" : "No"} />
                  <Field label="Go Live" value={item.goLiveDate} />
                  <Field label="Design" value={item.design} />
                  <Field label="Rista" value={item.rista} />
                  <Field label="Manpower (weeks)" value={item.manpowerWeeks} />
                </Section>

                {item.designAttachment ? (
                  <Section title="Design Attachment">
                    <div className="col-span-2">
                      <a
                        href={item.designAttachment}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
                      >
                        View attachment
                      </a>
                    </div>
                  </Section>
                ) : null}

                {tickets.length > 0 ? (
                  <Section title="Tickets">
                    <div className="col-span-2 flex flex-col gap-1">
                      {tickets.map((t) => (
                        <a
                          key={t.url}
                          href={t.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[13px] text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
                        >
                          {t.number} — {t.url}
                        </a>
                      ))}
                    </div>
                  </Section>
                ) : null}

                {item.description ? (
                  <Section title="Description">
                    <dd className="col-span-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                      {item.description}
                    </dd>
                  </Section>
                ) : null}

                {item.brandSignal ? (
                  <Section title="Brand Signal">
                    <dd className="col-span-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                      {item.brandSignal}
                    </dd>
                  </Section>
                ) : null}

                {item.why ? (
                  <Section title="Why">
                    <dd className="col-span-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                      {item.why}
                    </dd>
                  </Section>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {item?.isManual ? (
        <RoadmapTicketForm
          existing={{
            id: item.id,
            title: item.title,
            ticketUrl: item.ticketUrl,
            design: item.design,
            designAttachment: item.designAttachment,
            status: item.status,
            description: item.description,
          }}
          onSuccess={() => onOpenChange(false)}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  );
}
