import { NextRequest, NextResponse } from "next/server";
import { sendDashboardEmailReport } from "@/lib/email-report";

// puppeteer-core + @sparticuz/chromium need a real Node process (not the
// Edge runtime) and a screenshot round-trip is slow (cold-start chromium +
// page render), hence the generous maxDuration relative to the other cron
// routes in this app.
export const runtime = "nodejs";
export const maxDuration = 180;

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never authorize against an unset secret
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDashboardEmailReport();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
