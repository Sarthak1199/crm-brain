"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// navigator.clipboard.writeText copies the raw string verbatim — newlines,
// emoji, and placeholder syntax ({first_name} etc.) all come through exactly
// as stored, no reformatting.
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — nothing more we can do here.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      title="Copy message text"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-positive-foreground" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copy
        </>
      )}
    </button>
  );
}
