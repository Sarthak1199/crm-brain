import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncCreditConsumptionByWeek } from "@/lib/sync/sync-redash";

// Temporary, single-use route: wipes the corrupted creditConsumption.*
// MerchantSnapshot rows (accumulated duplicates from the pre-fix capturedAt
// bug — see sync-redash.ts) and re-syncs them fresh with the corrected,
// week-anchored logic. Deploy, call once, then delete this file.
export const maxDuration = 280;

const ONE_TIME_TOKEN = "929d2dc91df2eacc1d6131f7c438ad28958031d7d09c9100";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await prisma.merchantSnapshot.deleteMany({
    where: { fieldName: { startsWith: "creditConsumption." } },
  });

  const written = await syncCreditConsumptionByWeek();

  return NextResponse.json({ ok: true, deletedRows: deleted.count, writtenRows: written });
}
