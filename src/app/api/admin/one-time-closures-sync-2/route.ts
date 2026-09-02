import { NextResponse } from "next/server";
import { syncCrmLoyaltyClosuresSheet } from "@/lib/sync/sync-gsheets";

export const maxDuration = 240;

const TOKEN = "ea2173f8354edf984b6c2a1bebfb117e5396c38571e004b1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncCrmLoyaltyClosuresSheet();
  return NextResponse.json(result);
}
