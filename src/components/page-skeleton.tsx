import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic shimmer shell for pages shaped like {header, KPI cards, table} —
 * dropped in via each route's loading.tsx so navigation feels instant (the
 * shell paints immediately) while the page's own data fetch runs in the
 * background. Next.js automatically wraps page.tsx in a Suspense boundary
 * with this as the fallback whenever a sibling loading.tsx exists.
 */
export function PageSkeleton({ kpiCount = 3, tableRows = 8 }: { kpiCount?: number; tableRows?: number }) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {kpiCount > 0 ? (
        <div
          className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3"
          style={{ gridTemplateColumns: kpiCount > 3 ? `repeat(${kpiCount}, minmax(0, 1fr))` : undefined }}
        >
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="mt-4 h-3.5 w-24" />
              <Skeleton className="mt-2 h-7 w-16" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        {Array.from({ length: tableRows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
