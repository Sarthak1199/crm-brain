import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary, single-use read-only route to inspect the actual stored
// MerchantSnapshot rows for specific merchants while diagnosing wrong
// credit-consumption numbers — deploy, call once, then delete.
export const maxDuration = 30;

const ONE_TIME_TOKEN = "81c27e16b88988a5df835ca265f169fa4414ad5f4afd91c0";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mids = req.nextUrl.searchParams.get("mids")?.split(",") ?? ["22167", "22435"];

  const merchants = await prisma.merchant.findMany({
    where: { dotpeMid: { in: mids } },
    select: {
      id: true,
      dotpeMid: true,
      brandName: true,
      creditConsumedL30: true,
      creditConsumptionBreakup: true,
      snapshots: {
        where: {
          fieldName: {
            in: [
              "creditConsumption.total",
              "creditConsumption.campaigns",
              "creditConsumption.automations",
              "creditConsumption.loyalty",
              "customersReached.total",
              "customersReached.campaigns",
              "customersReached.automations",
              "customersReached.loyalty",
            ],
          },
        },
        orderBy: [{ fieldName: "asc" }, { capturedAt: "asc" }],
        select: { fieldName: true, capturedAt: true, value: true },
      },
    },
  });

  return NextResponse.json({ merchants });
}
