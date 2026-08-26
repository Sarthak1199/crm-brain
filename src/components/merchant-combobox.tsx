"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * `creatable` + `onCreateNew` opt into typing a name that isn't in the list
 * yet — used where the caller has a place to store a free-text name for a
 * merchant that doesn't exist in the Merchant table. Selecting an existing
 * merchant still goes through `onChange` as before; the two are mutually
 * exclusive from the caller's point of view (creating a new name should
 * clear any previously-selected id, and vice versa).
 */
export function MerchantCombobox({
  merchants,
  value,
  onChange,
  placeholder = "Select merchant...",
  creatable = false,
  createdName = null,
  onCreateNew,
}: {
  merchants: { id: string; brandName: string }[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  creatable?: boolean;
  createdName?: string | null;
  onCreateNew?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = merchants.find((m) => m.id === value);
  const displayLabel = selected ? selected.brandName : createdName;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merchants;
    return merchants.filter((m) => m.brandName.toLowerCase().includes(q));
  }, [merchants, query]);

  const trimmedQuery = query.trim();
  const exactMatch = filtered.some((m) => m.brandName.toLowerCase() === trimmedQuery.toLowerCase());
  const showCreateOption = creatable && trimmedQuery.length > 0 && !exactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-between rounded-lg text-[13px] font-normal",
            !displayLabel && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayLabel ?? placeholder}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1.5">
        <div className="relative mb-1.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={creatable ? "Search or type a new merchant name..." : "Search merchants..."}
            className="h-8 rounded-md pl-8 text-[13px]"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 && !showCreateOption ? (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">No matches</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
              >
                <span className="truncate">{m.brandName}</span>
                {value === m.id ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
              </button>
            ))
          )}
          {showCreateOption ? (
            <button
              type="button"
              onClick={() => {
                onCreateNew?.(trimmedQuery);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md border-t border-border px-2 py-1.5 text-left text-[13px] text-primary hover:bg-muted"
            >
              <Plus className="size-3.5 shrink-0" />
              <span className="truncate">Add &ldquo;{trimmedQuery}&rdquo; as new merchant</span>
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
