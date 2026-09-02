import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canMutate } from "@/lib/authz";
import { sendDashboardEmailReport } from "@/lib/email-report";

// Manual "Send now" trigger for the Email Alerts menu — same
// screenshot-and-send pipeline as the Mon/Wed/Fri cron
// (api/cron/email-report), just session-gated instead of CRON_SECRET-gated
// since this is a click from an already-authenticated dashboard user.
export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST() {
  const session = await auth();
  if (!canMutate(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await sendDashboardEmailReport();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
