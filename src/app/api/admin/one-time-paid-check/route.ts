import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary, single-use route to verify the paidBranches -> pendingBranches
// rename + isPaid() criterion fix landed correctly in production. Deploy,
// call once, then delete this file.
export const maxDuration = 30;

const ONE_TIME_TOKEN = "48c1944372b8e7d0a0821f3090a81cf8414aefd4e7c57e96";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchants = await prisma.merchant.findMany({
    select: { closedBranches: true, pendingBranches: true, crmActivationConfirmed: true },
  });

  const paidMx = merchants.filter((m) => m.closedBranches > 0).length;
  const closedBranchesSum = merchants.reduce((a, m) => a + m.closedBranches, 0);
  const pendingBranchesSum = merchants.reduce((a, m) => a + m.pendingBranches, 0);
  const crmActivationConfirmedCount = merchants.filter((m) => m.crmActivationConfirmed).length;

  return NextResponse.json({
    paidMx,
    closedBranchesSum,
    pendingBranchesSum,
    crmActivationConfirmedCount,
  });
}
