import { NextRequest, NextResponse } from "next/server";
import { syncCreditConsumptionByWeek } from "@/lib/sync/sync-redash";

// Temporary, single-use route. The corrupted creditConsumption.* rows were
// already wiped by a prior call to this route (before the delete step was
// removed here) — that run then hit FUNCTION_INVOCATION_TIMEOUT partway
// through the 13-week resync, leaving only the 3 most recent weeks written.
// This call just re-runs the resync alone (no delete — nothing stale is
// left to remove) to backfill the remaining weeks. Deploy, call once, then
// delete this file.
export const maxDuration = 280;

const ONE_TIME_TOKEN = "929d2dc91df2eacc1d6131f7c438ad28958031d7d09c9100";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const written = await syncCreditConsumptionByWeek();

  return NextResponse.json({ ok: true, writtenRows: written });
}
