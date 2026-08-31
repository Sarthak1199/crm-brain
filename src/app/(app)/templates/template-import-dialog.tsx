"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { importTemplates, type TemplateImportResult } from "./import-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TemplateImportDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TemplateImportResult | { error: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const res = await importTemplates(formData);
      setResult(res);
      if (!("error" in res)) router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setResult(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 gap-1.5 rounded-lg text-[13px]">
          <Upload className="size-3.5" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import templates</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with Template Name, Category, Event ID, and Template Text columns.
            Matching an existing template by name updates it in place; anything new is added. Rows missing a
            name or Event ID are skipped and reported below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="text-[13px] text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground hover:file:bg-muted/70"
          />

          {result ? (
            "error" in result ? (
              <p className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-[13px] text-negative-foreground">
                {result.error}
              </p>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[13px]">
                <p className="text-foreground">
                  {result.created} added, {result.updated} updated
                  {result.skipped.length > 0 ? `, ${result.skipped.length} skipped` : ""}.
                </p>
                {result.duplicateEventIds.length > 0 ? (
                  <p className="text-amber-700 dark:text-amber-400">
                    Duplicate Event IDs in file: {result.duplicateEventIds.join(", ")}
                  </p>
                ) : null}
                {result.skipped.length > 0 ? (
                  <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                    {result.skipped.map((s) => (
                      <li key={s.row}>
                        Row {s.row}: {s.reason}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          ) : null}

          <Button
            type="button"
            onClick={handleUpload}
            disabled={isPending}
            className="h-9 gap-1.5 self-end rounded-lg bg-[#0B1220] text-white hover:bg-[#0B1220]/90"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
