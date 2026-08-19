import { prisma } from "@/lib/prisma";
import { OverallTrendChart } from "./overall-trend-chart";

// Reads from our own DB, pre-synced by syncPortfolioTrend() — no live
// Redash call on page load (that query alone can take 30-60s+). `week` is
// stored as an ISO "YYYY-MM-DD" string, so it sorts and range-filters the
// same way the dashboard's date inputs do.
export async function OverallTrendLoader({ from, to }: { from?: string; to?: string }) {
  const rows = await prisma.portfolioTrend.findMany({
    where: {
      week: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    orderBy: { week: "asc" },
  });
  const data = rows.map((r) => ({
    week: r.week,
    consumed: Number(r.consumed),
    recharged: Number(r.recharged),
  }));

  return <OverallTrendChart data={data} />;
}
