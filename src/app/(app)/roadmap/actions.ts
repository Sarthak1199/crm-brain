"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateRoadmapStatus(id: string, status: string) {
  // The sheet's own status values aren't a closed set (the UI deliberately
  // lets an item's current, not-yet-catalogued value stay selectable), so
  // this isn't a strict allowlist — just a sanity bound against garbage.
  const trimmed = status.trim();
  if (!trimmed || trimmed.length > 100) return;

  await prisma.roadmapItem.update({ where: { id }, data: { status: trimmed } });
  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
}
