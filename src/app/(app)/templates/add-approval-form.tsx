"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { addTemplateApproval } from "./actions";
import { MerchantCombobox } from "@/components/merchant-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddApprovalForm({
  templateId,
  merchants,
  onSuccess,
}: {
  templateId: string;
  merchants: { id: string; brandName: string }[];
  onSuccess?: () => void;
}) {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [providerTemplateId, setProviderTemplateId] = useState("");

  const action = addTemplateApproval.bind(null, templateId);
  const [error, formAction, isPending] = useActionState(action, undefined);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (isPending) wasSubmitting.current = true;
    else if (wasSubmitting.current) {
      wasSubmitting.current = false;
      if (!error) {
        setMerchantId(null);
        setProviderTemplateId("");
        onSuccess?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <input type="hidden" name="merchantId" value={merchantId ?? ""} />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Merchant</Label>
          <MerchantCombobox merchants={merchants} value={merchantId} onChange={setMerchantId} placeholder="Search merchant..." />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="providerTemplateId" className="text-[11px] font-medium text-muted-foreground">
            Provider Template ID
          </Label>
          <Input
            id="providerTemplateId"
            name="providerTemplateId"
            value={providerTemplateId}
            onChange={(e) => setProviderTemplateId(e.target.value)}
            placeholder="e.g. 1786727532293000"
            required
            className="h-9 rounded-lg text-[13px]"
          />
        </div>
      </div>

      {error ? <p className="text-[12px] text-negative-foreground">{error}</p> : null}

      <Button
        type="submit"
        disabled={isPending || !merchantId}
        variant="outline"
        className="h-8 w-fit gap-1.5 self-end rounded-lg text-[12px]"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Add approval
      </Button>
    </form>
  );
}
