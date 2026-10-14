"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Smaller counterpart to app-shell/sync-button.tsx, scoped to a single
// endpoint (e.g. just the loyalty funnel query) rather than the whole
// multi-source sync — lives inline on a panel rather than the app header.
export function SyncFieldButton({ endpoint, label = "Sync now" }: { endpoint: string; label?: string }) {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const router = useRouter();

  async function handleSync() {
    setState("syncing");
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error("sync failed");
      setState("done");
      router.refresh();
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const text =
    state === "syncing" ? "Syncing..." : state === "done" ? "Synced" : state === "error" ? "Failed — retry" : label;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={state === "syncing"}
      className="h-8 shrink-0 gap-1.5 rounded-lg text-[12px]"
    >
      <RefreshCw className={cn("size-3.5", state === "syncing" && "animate-spin")} />
      {text}
    </Button>
  );
}
