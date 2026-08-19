import { formatDistanceToNow } from "date-fns";
import { getLastSyncTimes } from "@/lib/sync/sync-run";

function SyncDot({ label, at }: { label: string; at: Date | null }) {
  return (
    <div className="flex items-center gap-1.5" title={at ? at.toLocaleString("en-IN") : "Never synced"}>
      <span
        className={`size-1.5 rounded-full ${at ? "bg-positive" : "bg-muted-foreground/40"}`}
        aria-hidden
      />
      <span className="text-[12px] text-muted-foreground">
        {label} synced {at ? formatDistanceToNow(at, { addSuffix: true }) : "never"}
      </span>
    </div>
  );
}

export async function SyncStatusBar() {
  const { redash, gsheets } = await getLastSyncTimes();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <SyncDot label="Redash" at={redash} />
      <span className="text-muted-foreground/30">|</span>
      <SyncDot label="GSheets" at={gsheets} />
    </div>
  );
}
