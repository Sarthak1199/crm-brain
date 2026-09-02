import { NextRequest, NextResponse } from "next/server";
import { sendDashboardEmailReport } from "@/lib/email-report";

// Prisma needs a real Node process, not the Edge runtime.
export const runtime = "nodejs";
export const maxDuration = 30;

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
