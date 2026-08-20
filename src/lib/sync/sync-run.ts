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

// Generous over the 300s Vercel maxDuration on the cron/admin sync routes —
// a run still unfinished well past this has almost certainly been killed by
// a platform timeout (e.g. the combined redash+gsheets admin sync exceeding
// its shared budget) rather than genuinely still in progress.
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * `withSyncRun` records success:true whenever the aggregate function
 * doesn't throw — but each step inside is isolated by `runStep`, which
 * swallows its own errors into a `{error}` object instead of throwing. So a
 * run can be "successful" at the SyncRun level while every individual step
 * silently failed. This inspects the most recent *completed* run's summary
 * for step-level errors, so the status bar can distinguish "ran clean" from
 * "ran but degraded" — deliberately not the most recent run overall,
 * because a run killed mid-flight by a platform timeout never gets a
 * finishedAt, and treating that as "the" status would regress a real,
 * recently-successful sync to looking like it never ran. A crashed/stuck
 * newer attempt is instead surfaced separately via `stuckAttempt`.
 */
export async function getLastSyncStatus() {
  const sources: SyncSource[] = ["REDASH", "GSHEETS"];
  const results = await Promise.all(
    sources.map(async (source) => {
      const [lastFinished, latestAttempt] = await Promise.all([
        prisma.syncRun.findFirst({
          where: { source, finishedAt: { not: null } },
          orderBy: { finishedAt: "desc" },
          select: { finishedAt: true, success: true, summary: true },
        }),
        prisma.syncRun.findFirst({
          where: { source },
          orderBy: { startedAt: "desc" },
          select: { startedAt: true, finishedAt: true },
        }),
      ]);

      const failedSteps =
        lastFinished?.summary && typeof lastFinished.summary === "object"
          ? Object.entries(lastFinished.summary as Record<string, unknown>)
              .filter(([, v]) => isStepError(v))
              .map(([step]) => step)
          : [];

      const stuckAttempt =
        !!latestAttempt &&
        !latestAttempt.finishedAt &&
        Date.now() - latestAttempt.startedAt.getTime() > STUCK_THRESHOLD_MS;

      return [
        source,
        {
          finishedAt: lastFinished?.finishedAt ?? null,
          ok: !!lastFinished?.success && failedSteps.length === 0,
          failedSteps,
          stuckAttempt,
        },
      ] as const;
    })
  );

  return Object.fromEntries(results) as Record<
    SyncSource,
    { finishedAt: Date | null; ok: boolean; failedSteps: string[]; stuckAttempt: boolean }
  >;
}
