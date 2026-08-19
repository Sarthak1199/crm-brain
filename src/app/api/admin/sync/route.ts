import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isRedashConfigured } from "@/lib/redash";
import { isGsheetsConfigured } from "@/lib/gsheets";
import { syncRedash } from "@/lib/sync/sync-redash";
import { syncGsheets } from "@/lib/sync/sync-gsheets";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  if (isRedashConfigured()) {
    try {
      results.redash = await syncRedash();
    } catch (error) {
      errors.redash = error instanceof Error ? error.message : "Unknown error";
    }
  } else {
    errors.redash = "Not configured (REDASH_BASE_URL / REDASH_API_KEY)";
  }

  if (isGsheetsConfigured()) {
    try {
      results.gsheets = await syncGsheets();
    } catch (error) {
      errors.gsheets = error instanceof Error ? error.message : "Unknown error";
    }
  } else {
    errors.gsheets = "Not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)";
  }

  return NextResponse.json({ ok: Object.keys(errors).length === 0, results, errors });
}
