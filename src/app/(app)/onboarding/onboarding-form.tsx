"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Info, Loader2, Plus } from "lucide-react";
import { createOnboardingRequest } from "./actions";
import { MerchantNameField } from "@/components/merchant-name-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimpleToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type MerchantOption = { id: string; brandName: string; dotpeMid: string; ristaBrandId: string | null };

const LOYALTY_TYPES = ["Point based loyalty", "Visit based loyalty"];

const BRAND_FOCUS =
  "focus-visible:border-[#1188EF] focus-visible:ring-[#1188EF]/25 focus-visible:ring-[3px]";

type FieldName =
  | "businessName"
  | "enterpriseMerchantId"
  | "ristaBusinessId"
  | "ristaBrandId"
  | "ristaAccountNumber"
  | "ristaBranchId"
  | "branchCode"
  | "storeCode"
  | "enterpriseStoreId"
  | "dotpeUsername"
  | "loyaltyType";

const REQUIRED_FIELDS: FieldName[] = [
  "businessName",
  "enterpriseMerchantId",
  "ristaBusinessId",
  "ristaBrandId",
  "ristaAccountNumber",
  "ristaBranchId",
  "branchCode",
  "storeCode",
  "enterpriseStoreId",
  "dotpeUsername",
];

const FIELD_LABELS: Record<FieldName, string> = {
  businessName: "Business name",
  enterpriseMerchantId: "MerchantID (enterprise)",
  ristaBusinessId: "BusinessID (Rista)",
  ristaBrandId: "BrandID (Rista)",
  ristaAccountNumber: "Rista account number",
  ristaBranchId: "BranchID (Rista)",
  branchCode: "BranchCode",
  storeCode: "StoreCode",
  enterpriseStoreId: "StoreId (enterprise)",
  dotpeUsername: "Dotpe username",
  loyaltyType: "Loyalty type",
};

const EMPTY_VALUES: Record<FieldName, string> = {
  businessName: "",
  enterpriseMerchantId: "",
  ristaBusinessId: "",
  ristaBrandId: "",
  ristaAccountNumber: "",
  ristaBranchId: "",
  branchCode: "",
  storeCode: "",
  enterpriseStoreId: "",
  dotpeUsername: "",
  loyaltyType: "",
};

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function Section({ title, tip, children }: { title: string; tip?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <SectionLabel title={title} />
      {tip ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#1188EF]/25 bg-[#1188EF]/5 px-3 py-2 text-[12px] leading-relaxed text-foreground">
          <Info className="size-3.5 shrink-0 text-[#1188EF]" />
          <span className="truncate">{tip}</span>
        </div>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function RequiredLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Label className="text-[13px] font-medium text-foreground">
      {children}
      {required ? <span className="text-negative-foreground">*</span> : null}
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[12px] text-negative-foreground">{message}</p>;
}

function TextField({
  id,
  label,
  required,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  readOnly,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <RequiredLabel required={required}>{label}</RequiredLabel>
      <Input
        id={id}
        name={id}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-invalid={!!error}
        className={cn(
          "h-9 rounded-lg text-[13px]",
          BRAND_FOCUS,
          readOnly && "bg-muted/50 text-muted-foreground",
          error && "border-negative"
        )}
      />
      <FieldError message={error} />
    </div>
  );
}

export function OnboardingForm({ merchants, userEmail }: { merchants: MerchantOption[]; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<FieldName, string>>(EMPTY_VALUES);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  const [loyaltyChecked, setLoyaltyChecked] = useState(false);
  const [crmChecked, setCrmChecked] = useState(false);
  const [automationChecked, setAutomationChecked] = useState(false);
  const [loyaltyForAllBranches, setLoyaltyForAllBranches] = useState(false);
  const [featureGroupError, setFeatureGroupError] = useState(false);

  const [additionalComment, setAdditionalComment] = useState("");

  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; message: string }>({
    open: false,
    variant: "success",
    message: "",
  });

  const [actionError, formAction, isPending] = useActionState(createOnboardingRequest, undefined);
  const wasSubmitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function setField(name: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(name: FieldName) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function fieldError(name: FieldName): string | undefined {
    if (!touched[name]) return undefined;
    if (name === "loyaltyType") {
      return loyaltyChecked && !values.loyaltyType ? "Select a loyalty type." : undefined;
    }
    return values[name].trim() ? undefined : `${FIELD_LABELS[name]} is required.`;
  }

  function resetForm() {
    setMerchantId(null);
    setValues(EMPTY_VALUES);
    setTouched({});
    setLoyaltyChecked(false);
    setCrmChecked(false);
    setAutomationChecked(false);
    setLoyaltyForAllBranches(false);
    setFeatureGroupError(false);
    setAdditionalComment("");
    formRef.current?.reset();
  }

  useEffect(() => {
    if (isPending) wasSubmitting.current = true;
    else if (wasSubmitting.current) {
      wasSubmitting.current = false;
      if (!actionError) {
        setOpen(false);
        resetForm();
        setToast({ open: true, variant: "success", message: "Submitted" });
      } else {
        setToast({ open: true, variant: "error", message: actionError });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  function handleMerchantPick(id: string | null) {
    setMerchantId(id);
    const m = id ? merchants.find((x) => x.id === id) : undefined;
    if (m) {
      setField("enterpriseMerchantId", m.dotpeMid);
      setField("ristaBrandId", m.ristaBrandId ?? "");
    }
  }

  function handleLoyaltyToggle(next: boolean) {
    setLoyaltyChecked(next);
    if (!next) {
      setField("loyaltyType", "");
      setLoyaltyForAllBranches(false);
    }
  }

  // Client-side validation gate — mirrors the server's checks so the
  // redesigned inline/blur UI catches problems before a round-trip, not
  // only after a failed submit.
  function handleSubmit(formData: FormData) {
    const nextTouched: Partial<Record<FieldName, boolean>> = {};
    REQUIRED_FIELDS.forEach((f) => (nextTouched[f] = true));
    if (loyaltyChecked) nextTouched.loyaltyType = true;
    setTouched((prev) => ({ ...prev, ...nextTouched }));

    const missing = REQUIRED_FIELDS.some((f) => !values[f].trim());
    const loyaltyTypeMissing = loyaltyChecked && !values.loyaltyType;
    const noFeatureChecked = !loyaltyChecked && !crmChecked && !automationChecked;
    setFeatureGroupError(noFeatureChecked);

    if (missing || loyaltyTypeMissing || noFeatureChecked) return;

    formAction(formData);
  }

  return (
    <>
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
        <DialogContent className="max-w-3xl gap-0 p-0 sm:max-w-3xl">
          <div className="border-b border-border px-8 py-4">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-[18px]">Loyalty / CRM license request</DialogTitle>
              <DialogDescription className="text-[13px]">
                Submits directly into the &quot;Loyalty enable&quot; ops sheet — same pipeline as the Google
                Form.
              </DialogDescription>
            </DialogHeader>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              <span className="text-negative-foreground">*</span> All fields are mandatory except Additional
              Comments.
            </p>
          </div>

          <form
            ref={formRef}
            noValidate
            action={handleSubmit}
            className="flex max-h-[80vh] flex-col gap-5 overflow-y-auto px-8 py-5"
          >
            <Section title="Merchant Details">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <TextField id="email" label="Email address" required value={userEmail} readOnly />

                <div className="flex flex-col gap-1.5">
                  <RequiredLabel required>Business name</RequiredLabel>
                  <MerchantNameField
                    id="businessName"
                    name="businessName"
                    merchants={merchants.map((m) => ({ id: m.id, brandName: m.brandName }))}
                    value={values.businessName}
                    onChange={(v) => setField("businessName", v)}
                    onSelectMerchant={handleMerchantPick}
                    onBlur={() => handleBlur("businessName")}
                    placeholder="Type or search a merchant name..."
                    className={cn("h-9", BRAND_FOCUS, fieldError("businessName") && "border-negative")}
                  />
                  <FieldError message={fieldError("businessName")} />
                </div>

                <TextField
                  id="enterpriseMerchantId"
                  label="MerchantID (enterprise)"
                  required
                  value={values.enterpriseMerchantId}
                  onChange={(v) => setField("enterpriseMerchantId", v)}
                  onBlur={() => handleBlur("enterpriseMerchantId")}
                  error={fieldError("enterpriseMerchantId")}
                />
                <TextField
                  id="ristaBusinessId"
                  label="BusinessID (Rista)"
                  required
                  value={values.ristaBusinessId}
                  onChange={(v) => setField("ristaBusinessId", v)}
                  onBlur={() => handleBlur("ristaBusinessId")}
                  error={fieldError("ristaBusinessId")}
                />
                <TextField
                  id="ristaBrandId"
                  label="BrandID (Rista)"
                  required
                  value={values.ristaBrandId}
                  onChange={(v) => setField("ristaBrandId", v)}
                  onBlur={() => handleBlur("ristaBrandId")}
                  error={fieldError("ristaBrandId")}
                />
                <TextField
                  id="ristaAccountNumber"
                  label="Rista account number"
                  required
                  value={values.ristaAccountNumber}
                  onChange={(v) => setField("ristaAccountNumber", v)}
                  onBlur={() => handleBlur("ristaAccountNumber")}
                  error={fieldError("ristaAccountNumber")}
                />
              </div>
            </Section>

            <Section
              title="Branch Whitelisting"
              tip="Whitelisting multiple branches? Comma-separate values, e.g. 1232, 1233, 1234."
            >
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <TextField
                  id="ristaBranchId"
                  label="BranchID (Rista)"
                  required
                  value={values.ristaBranchId}
                  onChange={(v) => setField("ristaBranchId", v)}
                  onBlur={() => handleBlur("ristaBranchId")}
                  error={fieldError("ristaBranchId")}
                  placeholder="e.g. 1232, 1233, 1234"
                />
                <TextField
                  id="branchCode"
                  label="BranchCode"
                  required
                  value={values.branchCode}
                  onChange={(v) => setField("branchCode", v)}
                  onBlur={() => handleBlur("branchCode")}
                  error={fieldError("branchCode")}
                  placeholder="e.g. 1232, 1233, 1234"
                />
                <TextField
                  id="storeCode"
                  label="StoreCode"
                  required
                  value={values.storeCode}
                  onChange={(v) => setField("storeCode", v)}
                  onBlur={() => handleBlur("storeCode")}
                  error={fieldError("storeCode")}
                  placeholder="e.g. 1232, 1233, 1234"
                />
                <TextField
                  id="enterpriseStoreId"
                  label="StoreId (enterprise)"
                  required
                  value={values.enterpriseStoreId}
                  onChange={(v) => setField("enterpriseStoreId", v)}
                  onBlur={() => handleBlur("enterpriseStoreId")}
                  error={fieldError("enterpriseStoreId")}
                  placeholder="e.g. 1232, 1233, 1234"
                />
                <TextField
                  id="dotpeUsername"
                  label="Dotpe username"
                  required
                  value={values.dotpeUsername}
                  onChange={(v) => setField("dotpeUsername", v)}
                  onBlur={() => handleBlur("dotpeUsername")}
                  error={fieldError("dotpeUsername")}
                />
              </div>
            </Section>

            <Section title="Feature Enablement">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <Checkbox
                      checked={loyaltyChecked}
                      onCheckedChange={(v) => handleLoyaltyToggle(v === true)}
                    />
                    Loyalty
                  </label>
                  <label className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <Checkbox checked={crmChecked} onCheckedChange={(v) => setCrmChecked(v === true)} />
                    CRM
                  </label>
                  <label className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <Checkbox
                      checked={automationChecked}
                      onCheckedChange={(v) => setAutomationChecked(v === true)}
                    />
                    Automation
                  </label>
                </div>
                <FieldError
                  message={featureGroupError ? "Check at least one of Loyalty, CRM, or Automation." : undefined}
                />

                {loyaltyChecked ? (
                  <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex flex-col gap-1.5">
                      <RequiredLabel required>Loyalty type</RequiredLabel>
                      <Select value={values.loyaltyType} onValueChange={(v) => setField("loyaltyType", v)}>
                        <SelectTrigger
                          onBlur={() => handleBlur("loyaltyType")}
                          aria-invalid={!!fieldError("loyaltyType")}
                          className={cn(
                            "h-9 rounded-lg text-[13px]",
                            BRAND_FOCUS,
                            fieldError("loyaltyType") && "border-negative"
                          )}
                        >
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
                      <FieldError message={fieldError("loyaltyType")} />
                    </div>
                    <label className="flex items-center gap-2 text-[13px] text-foreground">
                      <Checkbox
                        checked={loyaltyForAllBranches}
                        onCheckedChange={(v) => setLoyaltyForAllBranches(v === true)}
                      />
                      Enable for all branches
                    </label>
                  </div>
                ) : null}
              </div>

              <input type="hidden" name="loyaltyType" value={values.loyaltyType} />
              <input type="hidden" name="loyaltyChecked" value={loyaltyChecked ? "on" : ""} />
              <input type="hidden" name="crmChecked" value={crmChecked ? "on" : ""} />
              <input type="hidden" name="automationChecked" value={automationChecked ? "on" : ""} />
              <input
                type="hidden"
                name="loyaltyForAllBranches"
                value={loyaltyForAllBranches ? "on" : ""}
              />
            </Section>

            <Section title="Notes">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="additionalComment" className="text-[13px] font-medium text-foreground">
                  Additional Comments
                </Label>
                <Textarea
                  id="additionalComment"
                  name="additionalComment"
                  value={additionalComment}
                  onChange={(e) => setAdditionalComment(e.target.value)}
                  rows={3}
                  className={cn("rounded-lg text-[13px]", BRAND_FOCUS)}
                />
              </div>
            </Section>

            <Button
              type="submit"
              disabled={isPending}
              className="h-9 w-auto shrink-0 gap-1.5 self-end rounded-lg bg-[#1188EF] text-white hover:bg-[#1188EF]/90"
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

      <SimpleToast
        open={toast.open}
        onOpenChange={(open) => setToast((t) => ({ ...t, open }))}
        variant={toast.variant}
        message={toast.message}
      />
    </>
  );
}
