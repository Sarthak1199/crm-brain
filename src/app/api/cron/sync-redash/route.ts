import { NextRequest, NextResponse } from "next/server";
import { isRedashConfigured } from "@/lib/redash";
import { syncRedash } from "@/lib/sync/sync-redash";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never authorize against an unset secret
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRedashConfigured()) {
    return NextResponse.json(
      { error: "Redash is not configured (REDASH_BASE_URL / REDASH_API_KEY)" },
      { status: 400 }
    );
  }

  try {
    const results = await syncRedash();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
