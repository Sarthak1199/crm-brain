import { NextRequest, NextResponse } from "next/server";
import { isGsheetsConfigured } from "@/lib/gsheets";
import { syncGsheets } from "@/lib/sync/sync-gsheets";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never authorize against an unset secret
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGsheetsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Sheets is not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)",
      },
      { status: 400 }
    );
  }

  try {
    const results = await syncGsheets();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
