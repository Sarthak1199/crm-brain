import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "759aa7d0b5b5093b650ed4b00e14b127edd8a86526e7af2a";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  const latest = await prisma.merchantSnapshot.groupBy({
    by: ["fieldName"],
    _count: true,
    _max: { capturedAt: true },
  });

  const inWindow = await prisma.merchantSnapshot.count({
    where: { fieldName: "creditConsumption.total", capturedAt: { gte: from, lte: to } },
  });

  return NextResponse.json({ latest, inWindow });
}
