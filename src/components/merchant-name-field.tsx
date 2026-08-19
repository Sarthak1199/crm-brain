"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export function MerchantNameField({
  merchants,
  value,
  onChange,
  onSelectMerchant,
  placeholder = "Type or search a merchant name...",
  id,
  name,
}: {
  merchants: { id: string; brandName: string }[];
  value: string;
  onChange: (name: string) => void;
  onSelectMerchant: (id: string | null) => void;
  placeholder?: string;
  id?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return merchants.filter((m) => m.brandName.toLowerCase().includes(q)).slice(0, 8);
  }, [merchants, value]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onSelectMerchant(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        required
        className="h-9 rounded-lg text-[13px]"
      />
      {open && filtered.length > 0 ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectMerchant(m.id);
                  onChange(m.brandName);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
              >
                {m.brandName}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
