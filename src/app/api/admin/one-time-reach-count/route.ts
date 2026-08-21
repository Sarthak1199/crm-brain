import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

const ONE_TIME_TOKEN = "81c27e16b88988a5df835ca265f169fa4414ad5f4afd91c0";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const byField = await prisma.merchantSnapshot.groupBy({
    by: ["fieldName"],
    where: { fieldName: { startsWith: "customersReached." } },
    _count: true,
  });

  const sample = await prisma.merchantSnapshot.findMany({
    where: { fieldName: "customersReached.total" },
    take: 10,
    orderBy: { capturedAt: "desc" },
    include: { merchant: { select: { brandName: true, dotpeMid: true } } },
  });

  return NextResponse.json({ byField, sample });
}
