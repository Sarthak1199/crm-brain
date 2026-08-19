"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { createSupportRequest, updateSupportRequest } from "./actions";
import { MerchantCombobox } from "@/components/merchant-combobox";
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

type MerchantOption = { id: string; brandName: string; totalStores: number; totalYearlyPotential: number };

export type ExistingRequest = {
  id: string;
  merchantId: string;
  type: "Bug" | "Feature";
  description: string;
  totalBranches: number;
  totalPotential: number;
  productRemarks: string | null;
  images: string[];
};

type DescriptionField = { key: string; value: string };

function emptyField(): DescriptionField {
  return { key: crypto.randomUUID(), value: "" };
}

export function RequestForm({
  merchants,
  existing,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: {
  merchants: MerchantOption[];
  existing?: ExistingRequest;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const isEdit = !!existing;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const [merchantId, setMerchantId] = useState<string | null>(existing?.merchantId ?? null);
  const [type, setType] = useState<"Bug" | "Feature" | "">(existing?.type ?? "");
  const [totalBranches, setTotalBranches] = useState(existing?.totalBranches?.toString() ?? "");
  const [totalPotential, setTotalPotential] = useState(existing?.totalPotential?.toString() ?? "");
  const [descriptions, setDescriptions] = useState<DescriptionField[]>(() =>
    isEdit ? [{ key: "existing", value: existing.description }] : [emptyField()]
  );
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  const action = isEdit ? updateSupportRequest.bind(null, existing.id) : createSupportRequest;
  const [error, formAction, isPending] = useActionState(action, undefined);
  const wasSubmitting = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedMerchant = merchants.find((m) => m.id === merchantId);

  function resetForm() {
    if (!isEdit) {
      setMerchantId(null);
      setType("");
      setTotalBranches("");
      setTotalPotential("");
      setDescriptions([emptyField()]);
    }
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviews([]);
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

  function handleMerchantChange(id: string) {
    setMerchantId(id);
    if (!isEdit) {
      const m = merchants.find((x) => x.id === id);
      if (m) {
        setTotalBranches(String(m.totalStores));
        setTotalPotential(String(Math.round(m.totalYearlyPotential)));
      }
    }
  }

  function updateDescription(key: string, value: string) {
    setDescriptions((prev) => prev.map((d) => (d.key === key ? { ...d, value } : d)));
  }

  function addDescription() {
    setDescriptions((prev) => [...prev, emptyField()]);
  }

  function removeDescription(key: string) {
    setDescriptions((prev) => (prev.length > 1 ? prev.filter((d) => d.key !== key) : prev));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 6);
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviews(files.map((file) => ({ file, url: URL.createObjectURL(file) })));
  }

  function removePreview(index: number) {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  const form = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit request" : "New bug or feature request"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Branches, potential, and remarks are manual — update as needed."
            : "Logged against one merchant. Add a description per individual ask — each becomes its own request."}
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="-mx-1 flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-1">
        <input type="hidden" name="merchantId" value={merchantId ?? ""} />
        <input type="hidden" name="type" value={type} />

        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px] font-medium text-foreground">Merchant</Label>
          <MerchantCombobox
            merchants={merchants}
            value={merchantId}
            onChange={handleMerchantChange}
            placeholder="Search merchant..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="totalBranches" className="text-[13px] font-medium text-foreground">
              Total branches
            </Label>
            <Input
              id="totalBranches"
              name="totalBranches"
              type="number"
              min={0}
              value={totalBranches}
              onChange={(e) => setTotalBranches(e.target.value)}
              placeholder={selectedMerchant ? String(selectedMerchant.totalStores) : "0"}
              required
              className="h-9 rounded-lg text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="totalPotential" className="text-[13px] font-medium text-foreground">
              Total potential (₹)
            </Label>
            <Input
              id="totalPotential"
              name="totalPotential"
              type="number"
              min={0}
              value={totalPotential}
              onChange={(e) => setTotalPotential(e.target.value)}
              placeholder="0"
              required
              className="h-9 rounded-lg text-[13px]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px] font-medium text-foreground">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as "Bug" | "Feature")}>
            <SelectTrigger className="h-9 rounded-lg text-[13px]">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bug">Bug</SelectItem>
              <SelectItem value="Feature">Feature</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[13px] font-medium text-foreground">
            {isEdit ? "Description" : "Descriptions (one per request)"}
          </Label>
          {descriptions.map((d, i) => (
            <div key={d.key} className="flex items-start gap-2">
              <Textarea
                name="description"
                value={d.value}
                onChange={(e) => updateDescription(d.key, e.target.value)}
                placeholder={`What's the issue or ask${descriptions.length > 1 ? ` #${i + 1}` : ""}?`}
                rows={3}
                required
                className="rounded-lg text-[13px]"
              />
              {!isEdit && descriptions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeDescription(d.key)}
                  className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ))}
          {!isEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={addDescription}
              className="h-8 w-fit gap-1.5 rounded-lg text-[12px]"
            >
              <Plus className="size-3.5" />
              Add another request
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="productRemarks" className="text-[13px] font-medium text-foreground">
            Product remarks
          </Label>
          <Textarea
            id="productRemarks"
            name="productRemarks"
            defaultValue={existing?.productRemarks ?? ""}
            placeholder="Triage notes, decisions, follow-ups..."
            rows={3}
            className="rounded-lg text-[13px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px] font-medium text-foreground">
            Images {isEdit ? "(adds to existing)" : ""}
          </Label>
          {isEdit && existing.images.length > 0 ? (
            <div className="flex flex-wrap gap-2 pb-1">
              {existing.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="size-14 rounded-lg border border-border object-cover" />
              ))}
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            name="images"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="text-[13px] text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground hover:file:bg-muted/70"
          />
          {previews.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {previews.map((p, i) => (
                <div key={p.url} className="group relative size-16 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePreview(i)}
                    className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
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
              {isEdit ? "Saving..." : "Submitting..."}
            </>
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Submit request"
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
            New Request
          </Button>
        </DialogTrigger>
      ) : null}
      {form}
    </Dialog>
  );
}
