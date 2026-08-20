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

function isStepError(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "string"
  );
}

/**
 * `withSyncRun` records success:true whenever the aggregate function
 * doesn't throw — but each step inside is isolated by `runStep`, which
 * swallows its own errors into a `{error}` object instead of throwing. So a
 * run can be "successful" at the SyncRun level while every individual step
 * silently failed. This reads the most recent run per source (regardless of
 * its `success` flag) and inspects its `summary` for any step-level errors,
 * so the status bar can distinguish "ran clean" from "ran but degraded".
 */
export async function getLastSyncStatus() {
  const sources: SyncSource[] = ["REDASH", "GSHEETS"];
  const runs = await Promise.all(
    sources.map((source) =>
      prisma.syncRun.findFirst({
        where: { source },
        orderBy: { startedAt: "desc" },
        select: { finishedAt: true, success: true, summary: true, error: true },
      })
    )
  );

  return Object.fromEntries(
    sources.map((source, i) => {
      const run = runs[i];
      if (!run) return [source, { finishedAt: null, ok: false, failedSteps: [] as string[] }];

      const failedSteps =
        run.summary && typeof run.summary === "object"
          ? Object.entries(run.summary as Record<string, unknown>)
              .filter(([, v]) => isStepError(v))
              .map(([step]) => step)
          : [];

      return [
        source,
        {
          finishedAt: run.finishedAt,
          ok: run.success && failedSteps.length === 0,
          failedSteps,
        },
      ];
    })
  ) as Record<SyncSource, { finishedAt: Date | null; ok: boolean; failedSteps: string[] }>;
}
