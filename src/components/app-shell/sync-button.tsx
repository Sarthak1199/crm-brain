"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const router = useRouter();

  async function handleSync() {
    setState("syncing");
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const body = await res.json().catch(() => null);
      // The route returns 200 even when a source fails to sync (it reports
      // failures in the body instead) — check body.ok, not just res.ok, or
      // a failed sync silently shows as "Synced".
      if (!res.ok || !body?.ok) throw new Error("sync failed");
      setState("done");
      // Server Components (dashboard/database/onboarding pages) read
      // straight from Prisma — without this the page keeps showing
      // whatever it rendered before the sync, even though the DB is fresh.
      router.refresh();
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSync}
      disabled={state === "syncing"}
      className="h-8 gap-1.5 rounded-lg text-[13px]"
    >
      <RefreshCw className={cn("size-3.5", state === "syncing" && "animate-spin")} />
      {state === "syncing"
        ? "Syncing..."
        : state === "done"
          ? "Synced"
          : state === "error"
            ? "Sync failed"
            : "Sync now"}
    </Button>
  );
}
