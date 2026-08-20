import { Skeleton } from "@/components/ui/skeleton";

function ChartCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-1.5 h-3 w-48" />
      <Skeleton className="mt-6 h-40 w-full" />
    </div>
  );
}

function Section({ cards }: { cards: number }) {
  return (
    <div className="mb-8">
      <Skeleton className="mb-3 h-4 w-36" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <ChartCard key={i} />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <Skeleton className="h-4 w-40" />
      </div>

      <Section cards={2} />
      <Section cards={2} />
      <Section cards={2} />
      <Section cards={2} />
      <Section cards={1} />
    </div>
  );
}
