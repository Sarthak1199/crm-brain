"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { File as FileIcon, Loader2, Plus, X } from "lucide-react";
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

type MerchantOption = { id: string; brandName: string; totalStores: number };

export type ExistingRequest = {
  id: string;
  merchantId: string | null;
  merchantNameFreeText: string | null;
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

const FILE_ACCEPT = "image/*,video/*,application/pdf,.csv,.xls,.xlsx";

function isPreviewableImage(file: File) {
  return file.type.startsWith("image/");
}

function fileNameFromUrl(url: string) {
  return url.split("/").pop() ?? url;
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
  const [merchantName, setMerchantName] = useState<string | null>(existing?.merchantNameFreeText ?? null);
  const [type, setType] = useState<"Bug" | "Feature" | "">(existing?.type ?? "");
  const [totalBranches, setTotalBranches] = useState(existing?.totalBranches?.toString() ?? "");
  const [totalPotential, setTotalPotential] = useState(existing?.totalPotential?.toString() ?? "");
  const [descriptions, setDescriptions] = useState<DescriptionField[]>(() =>
    isEdit ? [{ key: "existing", value: existing.description }] : [emptyField()]
  );
  const [previews, setPreviews] = useState<{ file: File; url: string | null }[]>([]);

  const action = isEdit ? updateSupportRequest.bind(null, existing.id) : createSupportRequest;
  const [error, formAction, isPending] = useActionState(action, undefined);
  const wasSubmitting = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedMerchant = merchants.find((m) => m.id === merchantId);

  function resetForm() {
    if (!isEdit) {
      setMerchantId(null);
      setMerchantName(null);
      setType("");
      setTotalBranches("");
      setTotalPotential("");
      setDescriptions([emptyField()]);
    }
    previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
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
    setMerchantName(null);
    if (!isEdit) {
      const m = merchants.find((x) => x.id === id);
      if (m) {
        setTotalBranches(String(m.totalStores));
      }
    }
  }

  function handleMerchantCreate(name: string) {
    setMerchantId(null);
    setMerchantName(name);
    if (!isEdit) {
      // A merchant that doesn't exist yet has no branch count to auto-fill
      // from — left for the filer to enter manually.
      setTotalBranches("");
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
    previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    setPreviews(files.map((file) => ({ file, url: isPreviewableImage(file) ? URL.createObjectURL(file) : null })));
  }

  function removePreview(index: number) {
    setPreviews((prev) => {
      const target = prev[index];
      if (target.url) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  const form = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit request" : "New bug or feature request"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update any field — the first description updates this request; add more to log additional asks for the same merchant."
            : "Logged against one merchant. Add a description per individual ask — each becomes its own request."}
        </DialogDescription>
      </DialogHeader>

      <form
        action={(formData) => {
          // Files live in local state (for preview/removal), not in the
          // native file input's FormData snapshot after re-renders —
          // append them explicitly so the action sees exactly what's shown.
          formData.delete("files");
          previews.forEach((p) => formData.append("files", p.file));
          formAction(formData);
        }}
        className="-mx-1 flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-1"
      >
        <input type="hidden" name="merchantId" value={merchantId ?? ""} />
        <input type="hidden" name="merchantName" value={merchantName ?? ""} />
        <input type="hidden" name="type" value={type} />

        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px] font-medium text-foreground">Merchant</Label>
          <MerchantCombobox
            merchants={merchants}
            value={merchantId}
            onChange={handleMerchantChange}
            placeholder="Search or add a merchant..."
            creatable
            createdName={merchantName}
            onCreateNew={handleMerchantCreate}
          />
          {merchantName ? (
            <p className="text-[12px] text-muted-foreground">
              New merchant — not yet in the system, so branches below won&apos;t auto-fill.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="totalBranches" className="text-[13px] font-medium text-foreground">
              Total Loyalty Branches
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
              Pending potential (₹)
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
            {isEdit ? "Descriptions" : "Descriptions (one per request)"}
          </Label>
          {descriptions.map((d, i) => (
            <div key={d.key} className="flex items-start gap-2">
              <Textarea
                name="description"
                value={d.value}
                onChange={(e) => updateDescription(d.key, e.target.value)}
                placeholder={
                  isEdit && i === 0
                    ? "What's the issue or ask?"
                    : `What's the issue or ask${descriptions.length > 1 ? ` #${i + 1}` : ""}?`
                }
                rows={3}
                required
                className="rounded-lg text-[13px]"
              />
              {descriptions.length > 1 ? (
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
          <Button
            type="button"
            variant="outline"
            onClick={addDescription}
            className="h-8 w-fit gap-1.5 rounded-lg text-[12px]"
          >
            <Plus className="size-3.5" />
            Add another request
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="productRemarks" className="text-[13px] font-medium text-foreground">
            Product remarks <span className="font-normal text-muted-foreground">(optional)</span>
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
            Files <span className="font-normal text-muted-foreground">(optional{isEdit ? " — adds to existing" : ""})</span>
          </Label>
          {isEdit && existing.images.length > 0 ? (
            <div className="flex flex-wrap gap-2 pb-1">
              {existing.images.map((src) =>
                /\.(jpg|jpeg|png|gif|webp)$/i.test(src) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="size-14 rounded-lg border border-border object-cover" />
                ) : (
                  <a
                    key={src}
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1 text-center hover:bg-muted/70"
                  >
                    <FileIcon className="size-4 text-muted-foreground" />
                    <span className="line-clamp-1 break-all text-[8px] leading-tight text-muted-foreground">
                      {fileNameFromUrl(src)}
                    </span>
                  </a>
                )
              )}
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            multiple
            onChange={handleFiles}
            className="text-[13px] text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground hover:file:bg-muted/70"
          />
          <p className="text-[11px] text-muted-foreground">
            Images, video, PDF, CSV, or Excel — up to 6 files, 8MB each.
          </p>
          {previews.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {previews.map((p, i) => (
                <div
                  key={`${p.file.name}-${i}`}
                  className="group relative flex size-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40"
                >
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 px-1 text-center">
                      <FileIcon className="size-5 text-muted-foreground" />
                      <span className="line-clamp-2 break-all text-[9px] leading-tight text-muted-foreground">
                        {p.file.name}
                      </span>
                    </div>
                  )}
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
