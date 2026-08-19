import { prisma } from "@/lib/prisma";
import type { SyncSource } from "@prisma/client";

/** Runs `fn`, recording a SyncRun row so the UI can show "last synced at". */
export async function withSyncRun<T>(source: SyncSource, fn: () => Promise<T>): Promise<T> {
  const run = await prisma.syncRun.create({ data: { source } });
  try {
    const result = await fn();
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), success: true, summary: result as object },
    });
    return result;
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

/**
 * Runs one sync step in isolation: a failure here (e.g. a sheet-level error
 * outside the function's own per-row try/catch) is caught and reported,
 * instead of throwing and skipping every step that would have run after it
 * in the same aggregate (this is exactly how "Sync now" silently skipped
 * roadmap/onboarding whenever an earlier GSheets step failed).
 */
export async function runStep<T>(label: string, fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (error) {
    console.error(`sync step "${label}" failed`, error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getLastSyncTimes() {
  const [redash, gsheets] = await Promise.all([
    prisma.syncRun.findFirst({
      where: { source: "REDASH", success: true },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    }),
    prisma.syncRun.findFirst({
      where: { source: "GSHEETS", success: true },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    }),
  ]);

  return {
    redash: redash?.finishedAt ?? null,
    gsheets: gsheets?.finishedAt ?? null,
  };
}
