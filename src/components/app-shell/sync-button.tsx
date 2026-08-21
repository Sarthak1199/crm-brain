"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// The interactive sync (/api/admin/sync) no longer runs the slow
// credit-consumption-by-week step — see that route's comment — so the
// remaining work (light Redash steps + GSheets) has measured ~170s at its
// slowest leg. This timeout is set well above that observed ceiling with
// real margin, not picked arbitrarily: below it and a healthy sync would
// routinely misreport as "timed out"; much above it and a genuinely hung
// request goes unreported for too long. Unlike before, hitting this now
// really does mean something went wrong server-side, not "probably still
// running" — the tooltip below no longer hedges on that.
const TIMEOUT_MS = 4 * 60 * 1000;

export function SyncButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error" | "timeout">("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const router = useRouter();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleSync() {
    setState("syncing");
    setElapsedSec(0);
    tickRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch("/api/admin/sync", { method: "POST", signal: controller.signal });
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
    } catch (error) {
      setState(error instanceof DOMException && error.name === "AbortError" ? "timeout" : "error");
    } finally {
      clearTimeout(timer);
      if (tickRef.current) clearInterval(tickRef.current);
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const label =
    state === "syncing"
      ? `Syncing... ${elapsedSec}s`
      : state === "done"
        ? "Synced"
        : state === "timeout"
          ? "Timed out — retry"
          : state === "error"
            ? "Sync failed"
            : "Sync now";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSync}
      disabled={state === "syncing"}
      title={state === "timeout" ? `No response after ${TIMEOUT_MS / 1000}s — that's well past this sync's normal ~3 minute ceiling, so something went wrong server-side. Retry, or check the status dots for details.` : undefined}
      className="h-8 gap-1.5 rounded-lg text-[13px]"
    >
      <RefreshCw className={cn("size-3.5", state === "syncing" && "animate-spin")} />
      {label}
    </Button>
  );
}
