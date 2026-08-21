"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { createTemplate, updateTemplate } from "./actions";
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
import { variablesForCategory } from "@/lib/template-variables";

export type Channel = "SMS" | "WhatsApp";
export type DealType = "WithDeal" | "WithoutDeal";
export type Category = "Loyalty" | "Automation" | "Campaign" | "Utility";
export type Handle = "Merchant" | "RistaByDotpe" | "DotpeCRM";

export const HANDLE_LABELS: Record<Handle, string> = {
  Merchant: "Merchant",
  RistaByDotpe: "Rista by DotPe",
  DotpeCRM: "DotPe CRM",
};

export type ExistingTemplate = {
  id: string;
  channel: Channel;
  dealType: DealType;
  messageText: string;
  category: Category | null;
  handle: Handle | null;
  requestedMid: string | null;
};

export function TemplateForm({
  existing,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: {
  existing?: ExistingTemplate;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const isEdit = !!existing;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  // New templates default to the most common combination (WhatsApp, With
  // Deal, Merchant handle, Loyalty category) so most submissions only need
  // the message text changed — editing an existing template always starts
  // from its actual saved values instead.
  const [channel, setChannel] = useState<Channel | "">(existing?.channel ?? "WhatsApp");
  const [dealType, setDealType] = useState<DealType | "">(existing?.dealType ?? "WithDeal");
  const [category, setCategory] = useState<Category | "">(existing?.category ?? "Loyalty");
  const [handle, setHandle] = useState<Handle | "">(existing?.handle ?? "Merchant");
  const [requestedMid, setRequestedMid] = useState(existing?.requestedMid ?? "");
  const [messageText, setMessageText] = useState(existing?.messageText ?? "");
  const messageTextRef = useRef<HTMLTextAreaElement>(null);
  const variables = variablesForCategory(category);

  const action = isEdit ? updateTemplate.bind(null, existing.id) : createTemplate;
  const [error, formAction, isPending] = useActionState(action, undefined);
  const wasSubmitting = useRef(false);

  function resetForm() {
    if (!isEdit) {
      setChannel("WhatsApp");
      setDealType("WithDeal");
      setCategory("Loyalty");
      setHandle("Merchant");
      setRequestedMid("");
      setMessageText("");
    }
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

  function insertVariable(variable: string) {
    const el = messageTextRef.current;
    if (!el) {
      setMessageText((t) => t + variable);
      return;
    }
    const start = el.selectionStart ?? messageText.length;
    const end = el.selectionEnd ?? messageText.length;
    const next = messageText.slice(0, start) + variable + messageText.slice(end);
    setMessageText(next);
    // Restore focus and place the cursor right after the inserted text —
    // without this the textarea loses selection state on the next render
    // and the cursor jumps to the end, making repeated inserts awkward.
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + variable.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  const form = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit template" : "New message template"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the template text or reclassify it."
            : "Create a template for SMS or WhatsApp. Approval submissions are added separately."}
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
        <input type="hidden" name="channel" value={channel} />
        <input type="hidden" name="dealType" value={dealType} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="handle" value={handle} />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-foreground">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger className="h-9 rounded-lg text-[13px]">
                <SelectValue placeholder="Select channel..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-foreground">Template Type</Label>
            <Select value={dealType} onValueChange={(v) => setDealType(v as DealType)}>
              <SelectTrigger className="h-9 rounded-lg text-[13px]">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WithDeal">With Deal</SelectItem>
                <SelectItem value="WithoutDeal">Without Deal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-foreground">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="h-9 rounded-lg text-[13px]">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Loyalty">Loyalty</SelectItem>
                <SelectItem value="Automation">Automation</SelectItem>
                <SelectItem value="Campaign">Campaign</SelectItem>
                <SelectItem value="Utility">Utility</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-foreground">Handle</Label>
            <Select value={handle} onValueChange={(v) => setHandle(v as Handle)}>
              <SelectTrigger className="h-9 rounded-lg text-[13px]">
                <SelectValue placeholder="Select handle..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Merchant">Merchant</SelectItem>
                <SelectItem value="RistaByDotpe">Rista by DotPe</SelectItem>
                <SelectItem value="DotpeCRM">DotPe CRM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requestedMid" className="text-[13px] font-medium text-foreground">
            Requested MID
          </Label>
          <Input
            id="requestedMid"
            name="requestedMid"
            value={requestedMid}
            onChange={(e) => setRequestedMid(e.target.value)}
            placeholder="Optional — MID of the merchant who requested this"
            className="h-9 rounded-lg text-[13px]"
          />
        </div>

        {variables.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-foreground">Insert variable</Label>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="rounded-full border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="messageText" className="text-[13px] font-medium text-foreground">
            Message Text
          </Label>
          <Textarea
            ref={messageTextRef}
            id="messageText"
            name="messageText"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Hi {first_name}, ..."
            rows={5}
            required
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
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save
            </>
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
            Add Template
          </Button>
        </DialogTrigger>
      ) : null}
      {form}
    </Dialog>
  );
}
