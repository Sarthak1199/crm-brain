import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "3ae2fdc5541f03f11287571f80dd07c619cfdf1f8004e07a";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const total = await prisma.supportRequest.count();
  const grouped = await prisma.supportRequest.groupBy({
    by: ["merchantId"],
    _count: { id: true },
    having: { merchantId: { _count: { gt: 1 } } },
  });

  const merchantsWithMultiple = await Promise.all(
    grouped
      .filter((g) => g.merchantId)
      .map(async (g) => {
        const merchant = await prisma.merchant.findUnique({
          where: { id: g.merchantId! },
          select: { brandName: true, dotpeMid: true },
        });
        return { merchant, count: g._count.id };
      })
  );

  const multiLineDescriptions = await prisma.supportRequest.findMany({
    where: { description: { contains: "\n" } },
    select: { id: true, merchantId: true, description: true, createdAt: true },
    take: 20,
  });

  const oldest = await prisma.supportRequest.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const newest = await prisma.supportRequest.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });

  return NextResponse.json({
    total,
    merchantsWithMultipleRequests: merchantsWithMultiple.length,
    merchantsWithMultiple,
    multiLineDescriptionsSample: multiLineDescriptions,
    oldest: oldest?.createdAt,
    newest: newest?.createdAt,
  });
}
