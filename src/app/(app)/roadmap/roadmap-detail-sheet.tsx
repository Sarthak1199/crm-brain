"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Section, Field } from "@/components/detail-panel";
import { RoadmapStatusSelect } from "@/components/roadmap-status-select";
import type { SerializedRoadmapItem } from "@/lib/serialize";

function ticketLinks(raw: string | null) {
  if (!raw) return [];
  return raw.match(/https?:\/\/\S+/g) ?? [];
}

export function RoadmapDetailSheet({
  item,
  onOpenChange,
}: {
  item: SerializedRoadmapItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const links = ticketLinks(item?.ticketUrl ?? null);

  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-xl">
        {item ? (
          <>
            <SheetHeader className="border-b border-border pb-4">
              <SheetTitle className="text-[18px]">{item.title}</SheetTitle>
              <SheetDescription>{item.theme ?? "Unthemed"}</SheetDescription>
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

              {links.length > 0 ? (
                <Section title="Tickets">
                  <div className="col-span-2 flex flex-col gap-1">
                    {links.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
                      >
                        {url}
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
  );
}
