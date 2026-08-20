"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  { value: "Utility", label: "Utility" },
  { value: "none", label: "Uncategorized" },
];

const HANDLE_OPTIONS = [
  { value: "all", label: "All Handles" },
  { value: "Merchant", label: "Merchant" },
  { value: "RistaByDotpe", label: "Rista by DotPe" },
  { value: "DotpeCRM", label: "DotPe CRM" },
];

function FilterDropdown({
  options,
  active,
  onSelect,
}: {
  options: { value: string; label: string }[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Select value={active} onValueChange={onSelect}>
      <SelectTrigger className="h-9 w-[160px] rounded-lg text-[13px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TemplatesFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeChannel = searchParams.get("channel") ?? "all";
  const activeCategory = searchParams.get("category") ?? "all";
  const activeHandle = searchParams.get("handle") ?? "all";

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
      <FilterDropdown options={CHANNEL_OPTIONS} active={activeChannel} onSelect={(v) => setParam("channel", v)} />
      <FilterDropdown options={CATEGORY_OPTIONS} active={activeCategory} onSelect={(v) => setParam("category", v)} />
      <FilterDropdown options={HANDLE_OPTIONS} active={activeHandle} onSelect={(v) => setParam("handle", v)} />
    </div>
  );
}
