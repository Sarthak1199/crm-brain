import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeRoadmapItem } from "@/lib/serialize";
import { PageHeader } from "@/components/page-header";
import { SyncStatusBar } from "@/components/sync-status-bar";
import { RoadmapFilters } from "./roadmap-filters";
import { RoadmapTable } from "./roadmap-table";

type SearchParams = { status?: string; priority?: string; theme?: string };

const PRIORITY_RANK: Record<string, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  Picked: 4,
};

function priorityRank(p: string | null) {
  if (!p) return 99;
  return PRIORITY_RANK[p] ?? 50;
}

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const where: Prisma.RoadmapItemWhereInput = {};
  if (params.status && params.status !== "all") where.status = params.status;
  if (params.priority && params.priority !== "all") where.priority = params.priority;
  if (params.theme && params.theme !== "all") where.theme = params.theme;

  const [items, allItems] = await Promise.all([
    prisma.roadmapItem.findMany({ where }),
    prisma.roadmapItem.findMany({ select: { status: true, priority: true, theme: true } }),
  ]);

  const rows = items
    .map(serializeRoadmapItem)
    .sort((a, b) => {
      const statusCmp = (a.status || "zzz").localeCompare(b.status || "zzz");
      if (statusCmp !== 0) return statusCmp;
      return priorityRank(a.priority) - priorityRank(b.priority);
    });

  const statuses = Array.from(new Set(allItems.map((i) => i.status).filter(Boolean))).sort();
  const priorities = Array.from(new Set(allItems.map((i) => i.priority).filter(Boolean))) as string[];
  const themes = Array.from(new Set(allItems.map((i) => i.theme).filter(Boolean))).sort() as string[];

  return (
    <div>
      <PageHeader
        title="Product Roadmap"
        description="Synced from the CRM product team's roadmap sheet — click a row for the full brief."
      />

      <div className="sticky top-16 z-[5] -mx-6 mb-5 border-b border-border bg-background/95 px-6 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RoadmapFilters statuses={statuses} priorities={priorities} themes={themes} />
          <SyncStatusBar />
        </div>
      </div>

      <RoadmapTable rows={rows} />
    </div>
  );
}
