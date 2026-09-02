"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SourceLink } from "@/lib/sync/source-links";

// A single "Sources" trigger instead of inlining every source link on the
// card footer — with several stat/chart cards per section, spelling out
// every link took up more room than the cards themselves needed.
//
// `bare` skips the own top-border/margin wrapper, for a card (like
// AdoptionKpiCard) that already has a bordered footer row and just wants
// the trigger placed inside it alongside something else (e.g. "View
// details") instead of stacking a second divider underneath.
export function SourcesButton({ sources, bare = false }: { sources?: SourceLink[]; bare?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  const trigger = (
    <DialogTrigger asChild>
      <button
        type="button"
        className="text-[11px] text-muted-foreground/70 underline decoration-dotted underline-offset-2 hover:text-muted-foreground"
      >
        Sources
      </button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {bare ? trigger : <div className="mt-3 border-t border-border pt-2.5">{trigger}</div>}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sources</DialogTitle>
          <DialogDescription>Data sources behind this figure.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
