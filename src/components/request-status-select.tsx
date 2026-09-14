"use client";

import { useState, useTransition } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { KNOWN_REQUEST_STATUSES, requestStatusToneClass } from "@/lib/request-status";
import { updateSupportRequestStatus } from "@/app/(app)/requests/actions";

export function RequestStatusSelect({
  id,
  status,
  canEdit = true,
}: {
  id: string;
  status: string | null;
  canEdit?: boolean;
}) {
  const [value, setValue] = useState(status ?? "");
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    setValue(next);
    startTransition(async () => {
      await updateSupportRequestStatus(id, next);
    });
  }

  if (!canEdit) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium",
          requestStatusToneClass(value)
        )}
      >
        {value || "New"}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-full border pl-2 pr-5 py-0.5 text-[12px] font-medium",
        requestStatusToneClass(value)
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
      >
        <option value="">New</option>
        {KNOWN_REQUEST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span className="pointer-events-none">{value || "New"}</span>
      {isPending ? (
        <Loader2 className="pointer-events-none absolute right-1 size-2.5 animate-spin" />
      ) : (
        <ChevronDown className="pointer-events-none absolute right-1 size-2.5 opacity-60" />
      )}
    </div>
  );
}
