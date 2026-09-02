import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeltaPill } from "@/components/status-badge";
import { SourcesButton } from "@/components/sources-button";
import type { SourceLink } from "@/lib/sync/source-links";

export function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  delta,
  sources,
  latest,
  onViewDetails,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  delta?: number;
  sources?: SourceLink[];
  /** Set when this stat always shows the latest synced snapshot and isn't affected by the date range filter. */
  latest?: boolean;
  onViewDetails?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 shadow-none transition-shadow hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
          <Icon className="size-4 text-foreground" />
        </div>
        {delta !== undefined ? <DeltaPill value={delta} /> : null}
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        {latest ? (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Latest
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <p className="mt-1 text-[28px] font-bold leading-none text-foreground">{value}</p>
          {subValue ? <p className="text-[12px] text-muted-foreground">{subValue}</p> : null}
        </div>
        {onViewDetails ? (
          <button
            type="button"
            onClick={onViewDetails}
            className="mb-0.5 inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-primary hover:underline"
          >
            View details
            <ArrowUpRight className="size-3" />
          </button>
        ) : null}
      </div>
      <SourcesButton sources={sources} />
    </div>
  );
}
