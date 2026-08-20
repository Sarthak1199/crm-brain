"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createRoadmapTicket, updateRoadmapTicket } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KNOWN_ROADMAP_STATUSES } from "@/lib/roadmap-status";

export type ExistingTicket = {
  id: string;
  title: string;
  ticketUrl: string | null;
  design: string | null;
  designAttachment: string | null;
  status: string;
  description: string | null;
};

export function RoadmapTicketForm({
  existing,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: {
  existing?: ExistingTicket;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const isEdit = !!existing;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [ticketUrl, setTicketUrl] = useState(existing?.ticketUrl ?? "");
  const [design, setDesign] = useState(existing?.design ?? "");
  const [status, setStatus] = useState(existing?.status ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const action = isEdit ? updateRoadmapTicket.bind(null, existing.id) : createRoadmapTicket;
  const [error, formAction, isPending] = useActionState(action, undefined);
  const wasSubmitting = useRef(false);

  function resetForm() {
    if (!isEdit) {
      setTitle("");
      setTicketUrl("");
      setDesign("");
      setStatus("");
      setDescription("");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    if (isPending) wasSubmitting.current = true;
    else if (wasSubmitting.current) {
      wasSubmitting.current = false;
      if (!error) {
        setOpen(false);
        resetForm();
        onSuccess?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  const statusOptions = status && !KNOWN_ROADMAP_STATUSES.includes(status as never) ? [status, ...KNOWN_ROADMAP_STATUSES] : KNOWN_ROADMAP_STATUSES;

  const form = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit product ticket" : "New product ticket"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update this ticket's details." : "Manually-created tickets aren't touched by the roadmap sheet sync."}
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        <input type="hidden" name="status" value={status} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title" className="text-[13px] font-medium text-foreground">
            Title
          </Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ticket title"
            required
            className="h-9 rounded-lg text-[13px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticketUrl" className="text-[13px] font-medium text-foreground">
              Ticket Link
            </Label>
            <Input
              id="ticketUrl"
              name="ticketUrl"
              type="url"
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://dotpe.atlassian.net/browse/DM-123"
              className="h-9 rounded-lg text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 rounded-lg text-[13px]">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="design" className="text-[13px] font-medium text-foreground">
            Design link
          </Label>
          <Input
            id="design"
            name="design"
            value={design}
            onChange={(e) => setDesign(e.target.value)}
            placeholder="Figma / design doc URL (or attach a file below)"
            className="h-9 rounded-lg text-[13px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px] font-medium text-foreground">
            Design attachment {isEdit && existing.designAttachment ? "(replaces existing)" : ""}
          </Label>
          {isEdit && existing.designAttachment ? (
            <a
              href={existing.designAttachment}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
            >
              View current attachment
            </a>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            name="designAttachment"
            accept="image/*,.pdf"
            className="text-[13px] text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground hover:file:bg-muted/70"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description" className="text-[13px] font-medium text-foreground">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this ticket about?"
            rows={4}
            className="rounded-lg text-[13px]"
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-[13px] text-negative-foreground">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending}
          className="mt-1 h-9 gap-1.5 self-end rounded-lg bg-[#0B1220] text-white hover:bg-[#0B1220]/90"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Create ticket"
          )}
        </Button>
      </form>
    </DialogContent>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button className="h-9 gap-1.5 rounded-lg bg-[#0B1220] text-white hover:bg-[#0B1220]/90">
            <Plus className="size-4" />
            New Ticket
          </Button>
        </DialogTrigger>
      ) : null}
      {form}
    </Dialog>
  );
}
