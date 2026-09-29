import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "04102f7e564f44c5101d6ca9a61c16702a40f468e3064cda";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const items = await prisma.roadmapItem.findMany({
    where: { title: { contains: "SMS support in loyalty", mode: "insensitive" } },
    select: {
      id: true,
      title: true,
      status: true,
      statusOverriddenAt: true,
      isManual: true,
      syncedAt: true,
    },
  });

  const recentSyncRuns = await prisma.syncRun.findMany({
    where: { source: "GSHEETS" },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: { startedAt: true, finishedAt: true, success: true, error: true, summary: true },
  });

  const totalOverridden = await prisma.roadmapItem.count({
    where: { statusOverriddenAt: { not: null } },
  });

  return NextResponse.json({ items, recentSyncRuns, totalOverridden });
}
