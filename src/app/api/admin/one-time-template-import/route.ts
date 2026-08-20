import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importMessageTemplates } from "@/lib/import-templates";

// Temporary, single-use route to run the Phase B message-template bulk
// import directly against production — deploy this, call it once, then
// delete the file. Not gated on CRON_SECRET or session auth: it exists for
// exactly one manual invocation, authorized by a token generated fresh for
// this purpose (never derived from, or reused as, any standing secret).
export const maxDuration = 60;

const ONE_TIME_TOKEN = "86798048a52373841ec9dd65dbdd9eda474d44cc542773b7";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await importMessageTemplates(prisma);
  return NextResponse.json({ ok: true, result });
}
