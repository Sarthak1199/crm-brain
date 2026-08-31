import { NextResponse } from "next/server";
import { syncCrmLoyaltyClosuresSheet } from "@/lib/sync/sync-gsheets";

export const maxDuration = 240;

const TOKEN = "c610526e1750e591cd254367bc72e8338578f1acc91a43b4";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncCrmLoyaltyClosuresSheet();
  return NextResponse.json(result);
}
