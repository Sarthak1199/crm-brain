"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createOnboardingRequest } from "./actions";
import { MerchantNameField } from "@/components/merchant-name-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type MerchantOption = { id: string; brandName: string; dotpeMid: string; ristaBrandId: string | null };

const LOYALTY_TYPES = ["Visit based loyalty", "Point based loyalty"];

export function OnboardingForm({ merchants }: { merchants: MerchantOption[] }) {
  const [open, setOpen] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [enterpriseMerchantId, setEnterpriseMerchantId] = useState("");
  const [ristaBrandId, setRistaBrandId] = useState("");
  const [loyaltyType, setLoyaltyType] = useState("");
  const [automation, setAutomation] = useState(false);
  const [crmLicenseRequested, setCrmLicenseRequested] = useState(false);

  const [error, formAction, isPending] = useActionState(createOnboardingRequest, undefined);
  const wasSubmitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function resetForm() {
    setMerchantId(null);
    setBusinessName("");
    setEnterpriseMerchantId("");
    setRistaBrandId("");
    setLoyaltyType("");
    setAutomation(false);
    setCrmLicenseRequested(false);
    formRef.current?.reset();
  }

  useEffect(() => {
    if (isPending) wasSubmitting.current = true;
    else if (wasSubmitting.current) {
      wasSubmitting.current = false;
      if (!error) {
        setOpen(false);
        resetForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  function handleMerchantPick(id: string | null) {
    setMerchantId(id);
    const m = id ? merchants.find((x) => x.id === id) : undefined;
    if (m) {
      setEnterpriseMerchantId(m.dotpeMid);
      setRistaBrandId(m.ristaBrandId ?? "");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-9 gap-1.5 rounded-lg bg-[#0B1220] text-white hover:bg-[#0B1220]/90">
          <Plus className="size-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Loyalty / CRM license request</DialogTitle>
          <DialogDescription>
            Submits directly into the "Loyalty enable" ops sheet — same pipeline as the Google Form.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="-mx-1 flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessName" className="text-[13px] font-medium text-foreground">
              Business name
            </Label>
            <MerchantNameField
              id="businessName"
              name="businessName"
              merchants={merchants.map((m) => ({ id: m.id, brandName: m.brandName }))}
              value={businessName}
              onChange={setBusinessName}
              onSelectMerchant={handleMerchantPick}
              placeholder="Type or search a merchant name..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="enterpriseMerchantId" className="text-[13px] font-medium text-foreground">
                MerchantID (enterprise)
              </Label>
              <Input
                id="enterpriseMerchantId"
                name="enterpriseMerchantId"
                value={enterpriseMerchantId}
                onChange={(e) => setEnterpriseMerchantId(e.target.value)}
                required
                className="h-9 rounded-lg text-[13px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ristaBusinessId" className="text-[13px] font-medium text-foreground">
                BusinessID (rista)
              </Label>
              <Input id="ristaBusinessId" name="ristaBusinessId" className="h-9 rounded-lg text-[13px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ristaBrandId" className="text-[13px] font-medium text-foreground">
                BrandID (rista)
              </Label>
              <Input
                id="ristaBrandId"
                name="ristaBrandId"
                value={ristaBrandId}
                onChange={(e) => setRistaBrandId(e.target.value)}
                className="h-9 rounded-lg text-[13px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ristaBranchId" className="text-[13px] font-medium text-foreground">
                BranchID (rista)
              </Label>
              <Input id="ristaBranchId" name="ristaBranchId" className="h-9 rounded-lg text-[13px]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branchCode" className="text-[13px] font-medium text-foreground">
                BranchCode
              </Label>
              <Input id="branchCode" name="branchCode" className="h-9 rounded-lg text-[13px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="storeCode" className="text-[13px] font-medium text-foreground">
                StoreCode
              </Label>
              <Input id="storeCode" name="storeCode" className="h-9 rounded-lg text-[13px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="enterpriseStoreId" className="text-[13px] font-medium text-foreground">
                StoreId (ent.)
              </Label>
              <Input id="enterpriseStoreId" name="enterpriseStoreId" className="h-9 rounded-lg text-[13px]" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-foreground">Loyalty type</Label>
            <Select value={loyaltyType} onValueChange={setLoyaltyType}>
              <SelectTrigger className="h-9 rounded-lg text-[13px]">
                <SelectValue placeholder="Select loyalty type..." />
              </SelectTrigger>
              <SelectContent>
                {LOYALTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="loyaltyType" value={loyaltyType} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dotpeUsername" className="text-[13px] font-medium text-foreground">
              Dotpe username
            </Label>
            <Input id="dotpeUsername" name="dotpeUsername" className="h-9 rounded-lg text-[13px]" />
          </div>

          <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-3">
            <label className="flex items-center gap-2 text-[13px] text-foreground">
              <Checkbox
                checked={automation}
                onCheckedChange={(v) => setAutomation(v === true)}
              />
              Automation
              <input type="hidden" name="automation" value={automation ? "on" : ""} />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-foreground">
              <Checkbox
                checked={crmLicenseRequested}
                onCheckedChange={(v) => setCrmLicenseRequested(v === true)}
              />
              CRM license enable?
              <input type="hidden" name="crmLicenseRequested" value={crmLicenseRequested ? "on" : ""} />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="additionalComment" className="text-[13px] font-medium text-foreground">
              Additional comment
            </Label>
            <Textarea id="additionalComment" name="additionalComment" rows={2} className="rounded-lg text-[13px]" />
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
                Submitting...
              </>
            ) : (
              "Submit request"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
