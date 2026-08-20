"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createTemplate, updateTemplate } from "./actions";
import { Button } from "@/components/ui/button";
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

export type Channel = "SMS" | "WhatsApp";
export type DealType = "WithDeal" | "WithoutDeal";
export type Category = "Loyalty" | "Automation" | "Campaign" | "OTP" | "Utility";

export type ExistingTemplate = {
  id: string;
  channel: Channel;
  dealType: DealType;
  messageText: string;
  category: Category | null;
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

  const [channel, setChannel] = useState<Channel | "">(existing?.channel ?? "");
  const [dealType, setDealType] = useState<DealType | "">(existing?.dealType ?? "");
  const [category, setCategory] = useState<Category | "">(existing?.category ?? "");
  const [messageText, setMessageText] = useState(existing?.messageText ?? "");

  const action = isEdit ? updateTemplate.bind(null, existing.id) : createTemplate;
  const [error, formAction, isPending] = useActionState(action, undefined);
  const wasSubmitting = useRef(false);

  function resetForm() {
    if (!isEdit) {
      setChannel("");
      setDealType("");
      setCategory("");
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

  const form = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit template" : "New message template"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the template text or reclassify it."
            : "Create a template for SMS or WhatsApp. Merchant approvals are added separately once approved."}
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="channel" value={channel} />
        <input type="hidden" name="dealType" value={dealType} />
        <input type="hidden" name="category" value={category} />

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
              <SelectItem value="OTP">OTP</SelectItem>
              <SelectItem value="Utility">Utility</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="messageText" className="text-[13px] font-medium text-foreground">
            Message Text
          </Label>
          <Textarea
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
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Create template"
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
