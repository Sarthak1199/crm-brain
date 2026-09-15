import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeMid } from "@/lib/sync/mid";
import { fetchMxGrain } from "@/lib/sync/redash-queries";

const TOKEN = "66fa57666165aeb95af635d883daa8aca83db017a8d56744";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const merchants = await prisma.merchant.findMany({
    select: { id: true, brandName: true, dotpeMid: true, loyaltyStatus: true },
  });
  const merchantByMid = new Map(merchants.map((m) => [normalizeMid(m.dotpeMid), m]));

  const rows = (await fetchMxGrain()) as unknown as Record<string, unknown>[];
  const byMid = new Map(rows.map((r) => [normalizeMid(String(r["Dotpe_Merchant_ID"])), r]));

  const hasLoyaltyCrmTrueFresh = rows.filter((r) => r["Has_Loyalty_CRM"]).length;

  // Cross-check both candidate fields against our known-good loyaltyStatus
  // (query 10921, CRM-specific loyalty funnel) for every merchant in our
  // roster, to see which one (if either) actually agrees with it.
  const crossCheck = merchants.map((m) => {
    const row = byMid.get(normalizeMid(m.dotpeMid));
    return {
      brandName: m.brandName,
      dotpeMid: m.dotpeMid,
      loyaltyStatusActive: m.loyaltyStatus === "Active",
      Has_Loyalty: row ? !!row["Has_Loyalty"] : "NOT_IN_11166",
      Has_Loyalty_CRM: row ? !!row["Has_Loyalty_CRM"] : "NOT_IN_11166",
      Products_Owned: row ? row["Products_Owned"] : "NOT_IN_11166",
    };
  });

  const agreesWithHasLoyalty = crossCheck.filter((c) => c.loyaltyStatusActive === c.Has_Loyalty).length;
  const agreesWithHasLoyaltyCrm = crossCheck.filter((c) => c.loyaltyStatusActive === c.Has_Loyalty_CRM).length;

  return NextResponse.json({
    merchantCount: merchants.length,
    loyaltyStatusActiveCount: merchants.filter((m) => m.loyaltyStatus === "Active").length,
    hasLoyaltyCrmTrueFreshInFullDataset: hasLoyaltyCrmTrueFresh,
    agreesWithHasLoyalty,
    agreesWithHasLoyaltyCrm,
    crossCheckSample: crossCheck.slice(0, 30),
  });
}
