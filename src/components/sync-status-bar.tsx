import { formatDistanceToNow } from "date-fns";
import { getLastSyncStatus } from "@/lib/sync/sync-run";

function SyncDot({
  label,
  at,
  ok,
  failedSteps,
  stuckAttempt,
}: {
  label: string;
  at: Date | null;
  ok: boolean;
  failedSteps: string[];
  stuckAttempt: boolean;
}) {
  const dotColor = !at ? "bg-muted-foreground/40" : ok ? "bg-positive" : "bg-negative";
  const title = [
    !at ? "Never synced" : ok ? at.toLocaleString("en-IN") : `${at.toLocaleString("en-IN")} — failed: ${failedSteps.join(", ") || "unknown error"}`,
    stuckAttempt ? "A newer sync attempt started but never finished (likely timed out) — retry it." : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-1.5" title={title}>
      <span className={`size-1.5 rounded-full ${dotColor}`} aria-hidden />
      <span className="text-[12px] text-muted-foreground">
        {label} {at ? `synced ${formatDistanceToNow(at, { addSuffix: true })}` : "never synced"}
        {at && !ok && (
          <span className="text-negative"> — {failedSteps.length > 0 ? `${failedSteps.join(", ")} failed` : "failed"}</span>
        )}
        {stuckAttempt ? <span className="text-negative"> · retry needed</span> : null}
      </span>
    </div>
  );
}

export async function SyncStatusBar() {
  const status = await getLastSyncStatus();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <SyncDot
        label="Redash"
        at={status.REDASH.finishedAt}
        ok={status.REDASH.ok}
        failedSteps={status.REDASH.failedSteps}
        stuckAttempt={status.REDASH.stuckAttempt}
      />
      <span className="text-muted-foreground/30">|</span>
      <SyncDot
        label="GSheets"
        at={status.GSHEETS.finishedAt}
        ok={status.GSHEETS.ok}
        failedSteps={status.GSHEETS.failedSteps}
        stuckAttempt={status.GSHEETS.stuckAttempt}
      />
    </div>
  );
}
