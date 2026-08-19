"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

const RANGE_PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "60D", days: 60 },
  { label: "90D", days: 90 },
];
const DEFAULT_PRESET_DAYS = 30;

export function DashboardFilters({
  merchantOptions,
}: {
  merchantOptions: { id: string; brandName: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const selectedIds = new Set((searchParams.get("mx") ?? "").split(",").filter(Boolean));

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void, mode: "push" | "replace" = "push") => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router[mode](`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Default the date range to the last 30 days, made explicit in the URL
  // (rather than silently filtering) so it's visible and shareable.
  useEffect(() => {
    if (from || to) return;
    pushParams((params) => {
      params.set("from", daysAgo(DEFAULT_PRESET_DAYS));
      params.set("to", isoDate(new Date()));
    }, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function setDate(key: "from" | "to", value: string) {
    pushParams((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  function applyPreset(days: number) {
    pushParams((params) => {
      params.set("from", daysAgo(days));
      params.set("to", isoDate(new Date()));
    });
  }

  const activePresetDays = useMemo(() => {
    const today = isoDate(new Date());
    if (to !== today) return null;
    const preset = RANGE_PRESETS.find((p) => daysAgo(p.days) === from);
    return preset?.days ?? null;
  }, [from, to]);

  function toggleMx(id: string) {
    pushParams((params) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) params.delete("mx");
      else params.set("mx", Array.from(next).join(","));
    });
  }

  function clearMx() {
    pushParams((params) => params.delete("mx"));
  }

  const filteredMerchants = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merchantOptions;
    return merchantOptions.filter((m) => m.brandName.toLowerCase().includes(q));
  }, [merchantOptions, query]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={from}
          onChange={(e) => setDate("from", e.target.value)}
          className="h-9 w-[150px] rounded-lg text-[13px]"
        />
        <span className="text-[12px] text-muted-foreground">to</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => setDate("to", e.target.value)}
          className="h-9 w-[150px] rounded-lg text-[13px]"
        />
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
              activePresetDays === preset.days
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 gap-1.5 rounded-lg text-[13px] font-normal"
          >
            {selectedIds.size === 0
              ? "Merchant"
              : `${selectedIds.size} Merchant${selectedIds.size > 1 ? "s" : ""}`}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1.5">
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchants..."
              className="h-8 rounded-md pl-8 text-[13px]"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredMerchants.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">No matches</p>
            ) : (
              filteredMerchants.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedIds.has(m.id)}
                    onCheckedChange={() => toggleMx(m.id)}
                  />
                  {m.brandName}
                </label>
              ))
            )}
          </div>
          {selectedIds.size > 0 ? (
            <button
              onClick={clearMx}
              className="mt-1 flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted"
            >
              <X className="size-3" /> Clear selection
            </button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
