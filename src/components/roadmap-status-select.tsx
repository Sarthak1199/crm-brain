"use client";

import { useState, useTransition } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { KNOWN_ROADMAP_STATUSES, statusToneClass } from "@/lib/roadmap-status";
import { updateRoadmapStatus } from "@/app/(app)/roadmap/actions";

export function RoadmapStatusSelect({
  id,
  status,
  canEdit = true,
}: {
  id: string;
  status: string;
  canEdit?: boolean;
}) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  const options = value && !KNOWN_ROADMAP_STATUSES.includes(value as never) ? [value, ...KNOWN_ROADMAP_STATUSES] : KNOWN_ROADMAP_STATUSES;

  function handleChange(next: string) {
    setValue(next);
    startTransition(async () => {
      await updateRoadmapStatus(id, next);
    });
  }

  if (!canEdit) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium",
          statusToneClass(value)
        )}
      >
        {value || "Unspecified"}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-full border pl-2 pr-5 py-0.5 text-[12px] font-medium",
        statusToneClass(value)
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
        {!value ? <option value="">Unspecified</option> : null}
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span className="pointer-events-none">{value || "Unspecified"}</span>
      {isPending ? (
        <Loader2 className="pointer-events-none absolute right-1 size-2.5 animate-spin" />
      ) : (
        <ChevronDown className="pointer-events-none absolute right-1 size-2.5 opacity-60" />
      )}
    </div>
  );
}
