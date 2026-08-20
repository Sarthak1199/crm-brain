"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const CHANNEL_OPTIONS = [
  { value: "all", label: "All Channels" },
  { value: "SMS", label: "SMS" },
  { value: "WhatsApp", label: "WhatsApp" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "Loyalty", label: "Loyalty" },
  { value: "Automation", label: "Automation" },
  { value: "Campaign", label: "Campaign" },
  { value: "OTP", label: "OTP" },
  { value: "Utility", label: "Utility" },
  { value: "none", label: "Uncategorized" },
];

function FilterGroup({
  options,
  active,
  onSelect,
}: {
  options: { value: string; label: string }[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            active === o.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TemplatesFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeChannel = searchParams.get("channel") ?? "all";
  const activeCategory = searchParams.get("category") ?? "all";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete(key);
      else params.set(key, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterGroup options={CHANNEL_OPTIONS} active={activeChannel} onSelect={(v) => setParam("channel", v)} />
      <FilterGroup options={CATEGORY_OPTIONS} active={activeCategory} onSelect={(v) => setParam("category", v)} />
    </div>
  );
}
