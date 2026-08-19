"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CRM_OPTIONS = [
  { value: "all", label: "All CRM license" },
  { value: "NA", label: "N/A" },
  { value: "Active", label: "Active" },
  { value: "Paused", label: "Paused" },
  { value: "Expired", label: "Expired" },
];

const LOYALTY_OPTIONS = [
  { value: "all", label: "All loyalty license" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const ONBOARD_OPTIONS = [
  { value: "all", label: "All onboard status" },
  { value: "Onboarded", label: "Onboarded" },
  { value: "NotOnboarded", label: "Not onboarded" },
];

export function DatabaseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("q", q);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Mx name..."
          className="h-9 w-56 rounded-lg pl-8 text-[13px]"
        />
      </div>

      <Select
        defaultValue={searchParams.get("crm") ?? "all"}
        onValueChange={(v) => setParam("crm", v)}
      >
        <SelectTrigger className="h-9 w-[168px] rounded-lg text-[13px]">
          <SelectValue placeholder="CRM license" />
        </SelectTrigger>
        <SelectContent>
          {CRM_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("loyalty") ?? "all"}
        onValueChange={(v) => setParam("loyalty", v)}
      >
        <SelectTrigger className="h-9 w-[172px] rounded-lg text-[13px]">
          <SelectValue placeholder="Loyalty license" />
        </SelectTrigger>
        <SelectContent>
          {LOYALTY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("onboarded") ?? "all"}
        onValueChange={(v) => setParam("onboarded", v)}
      >
        <SelectTrigger className="h-9 w-[176px] rounded-lg text-[13px]">
          <SelectValue placeholder="Onboard status" />
        </SelectTrigger>
        <SelectContent>
          {ONBOARD_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
