import { cn } from "@/lib/utils";
import { SourcesButton } from "@/components/sources-button";
import type { SourceLink } from "@/lib/sync/source-links";

export function ChartCard({
  title,
  description,
  action,
  sources,
  latest,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  sources?: SourceLink[];
  /** Set when this chart always shows the latest synced snapshot and isn't affected by the date range filter. */
  latest?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 shadow-none transition-shadow hover:shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
            {latest ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Latest
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
      <SourcesButton sources={sources} />
    </div>
  );
}
