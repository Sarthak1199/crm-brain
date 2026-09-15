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
    select: { id: true, brandName: true, dotpeMid: true, loyaltyStatus: true, grainHasLoyalty: true },
  });
  const merchantByMid = new Map(merchants.map((m) => [normalizeMid(m.dotpeMid), m]));

  const rows = await fetchMxGrain();
  const hasLoyaltyRows = rows.filter((r) => (r as unknown as Record<string, unknown>)["Has_Loyalty"]);

  const matchedHasLoyalty = hasLoyaltyRows
    .map((r) => {
      const rec = r as unknown as Record<string, unknown>;
      const merchant = merchantByMid.get(normalizeMid(String(rec["Dotpe_Merchant_ID"])));
      return { redashMid: rec["Dotpe_Merchant_ID"], redashName: rec["Dotpe_Merchant_Name"], merchant };
    });

  const matchedCount = matchedHasLoyalty.filter((x) => x.merchant).length;
  const unmatchedSample = matchedHasLoyalty.filter((x) => !x.merchant).slice(0, 10);

  // Cross-check the other direction: of merchants with loyaltyStatus
  // Active (the real usage signal, 42), how many show Has_Loyalty in the
  // fresh Redash fetch vs what's stored as grainHasLoyalty in our DB?
  const activeLoyaltyMerchants = merchants.filter((m) => m.loyaltyStatus === "Active");
  const freshHasLoyaltyByMid = new Map(
    rows.map((r) => {
      const rec = r as unknown as Record<string, unknown>;
      return [normalizeMid(String(rec["Dotpe_Merchant_ID"])), !!rec["Has_Loyalty"]];
    })
  );
  const activeLoyaltyCrossCheck = activeLoyaltyMerchants.map((m) => ({
    brandName: m.brandName,
    dotpeMid: m.dotpeMid,
    storedGrainHasLoyalty: m.grainHasLoyalty,
    freshRedashHasLoyalty: freshHasLoyaltyByMid.get(normalizeMid(m.dotpeMid)) ?? "NOT_FOUND_IN_11166",
  }));

  return NextResponse.json({
    totalRedashRows: rows.length,
    hasLoyaltyTrueInRedashFresh: hasLoyaltyRows.length,
    matchedToOurRoster: matchedCount,
    ourDbGrainHasLoyaltyTrue: merchants.filter((m) => m.grainHasLoyalty).length,
    unmatchedSample,
    activeLoyaltyCrossCheck,
  });
}
