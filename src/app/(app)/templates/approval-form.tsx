"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Check, X as XIcon } from "lucide-react";
import { addTemplateApproval, updateTemplateApproval } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ApprovalStatus = "Submitted" | "Approved";

export type ExistingApproval = {
  id: string;
  approvalStatus: ApprovalStatus;
  eventId: string | null;
  providerTemplateId: string | null;
};

export function ApprovalForm({
  templateId,
  existing,
  onSuccess,
  onCancel,
}: {
  templateId: string;
  existing?: ExistingApproval;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!existing;
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(existing?.approvalStatus ?? "Submitted");
  const [eventId, setEventId] = useState(existing?.eventId ?? "");
  const [providerTemplateId, setProviderTemplateId] = useState(existing?.providerTemplateId ?? "");

  const action = isEdit ? updateTemplateApproval.bind(null, existing.id) : addTemplateApproval.bind(null, templateId);
  const [error, formAction, isPending] = useActionState(action, undefined);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (isPending) wasSubmitting.current = true;
    else if (wasSubmitting.current) {
      wasSubmitting.current = false;
      if (!error) {
        if (!isEdit) {
          setApprovalStatus("Submitted");
          setEventId("");
          setProviderTemplateId("");
        }
        onSuccess?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <input type="hidden" name="approvalStatus" value={approvalStatus} />
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Approval Status</Label>
          <Select value={approvalStatus} onValueChange={(v) => setApprovalStatus(v as ApprovalStatus)}>
            <SelectTrigger className="h-9 rounded-lg text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`eventId-${existing?.id ?? "new"}`} className="text-[11px] font-medium text-muted-foreground">
            Event ID
          </Label>
          <Input
            id={`eventId-${existing?.id ?? "new"}`}
            name="eventId"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Optional"
            className="h-9 rounded-lg text-[13px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`templateId-${existing?.id ?? "new"}`} className="text-[11px] font-medium text-muted-foreground">
            Template ID
          </Label>
          <Input
            id={`templateId-${existing?.id ?? "new"}`}
            name="providerTemplateId"
            value={providerTemplateId}
            onChange={(e) => setProviderTemplateId(e.target.value)}
            placeholder="Optional"
            className="h-9 rounded-lg text-[13px]"
          />
        </div>
      </div>

      {error ? <p className="text-[12px] text-negative-foreground">{error}</p> : null}

      <div className="flex justify-end gap-1.5">
        {isEdit ? (
          <Button type="button" variant="ghost" onClick={onCancel} className="h-8 gap-1 rounded-lg text-[12px]">
            <XIcon className="size-3.5" />
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isPending} variant="outline" className="h-8 w-fit gap-1.5 rounded-lg text-[12px]">
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : isEdit ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
          {isEdit ? "Save" : "Add submission"}
        </Button>
      </div>
    </form>
  );
}
