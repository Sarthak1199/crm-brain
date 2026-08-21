import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary, single-use route: sums stored creditConsumption.* snapshots
// per merchant for a fixed window (2026-07-27 to 2026-08-16, i.e. the 3
// most recent weekly buckets) so the result can be diffed against a direct
// Redash 11147 pull for the same window. Deploy, call once, then delete.
export const maxDuration = 30;

const ONE_TIME_TOKEN = "659084fa1c0e081c944391dc18232d18ca9e991a720ca890";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchants = await prisma.merchant.findMany({
    select: {
      dotpeMid: true,
      brandName: true,
      snapshots: {
        where: {
          fieldName: { startsWith: "creditConsumption." },
          capturedAt: { gte: new Date("2026-07-27T00:00:00.000Z"), lte: new Date("2026-08-16T00:00:00.000Z") },
        },
        select: { fieldName: true, value: true },
      },
    },
  });

  const result = merchants
    .filter((m) => m.snapshots.length > 0)
    .map((m) => {
      const sum = (field: string) =>
        m.snapshots.filter((s) => s.fieldName === field).reduce((a, s) => a + Number(s.value), 0);
      return {
        dotpeMid: m.dotpeMid,
        brandName: m.brandName,
        total: sum("creditConsumption.total"),
        campaigns: sum("creditConsumption.campaigns"),
        automations: sum("creditConsumption.automations"),
        loyalty: sum("creditConsumption.loyalty"),
      };
    });

  return NextResponse.json({ merchants: result });
}
