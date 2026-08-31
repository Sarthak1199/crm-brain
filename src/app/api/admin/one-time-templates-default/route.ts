import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "6af16df39e2620de356132715c201666df533b8e90c414bf";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await prisma.template.updateMany({
    where: { eventId: { not: null } },
    data: { isDefault: true },
  });

  return NextResponse.json({ updated: result.count });
}
