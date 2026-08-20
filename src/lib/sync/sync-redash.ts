import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  fetchAutomationPerformance,
  fetchCrmAdoption,
  fetchCreditConsumptionBreakup,
  fetchCrmCreditPrePost,
  fetchCrmWeeklyTrend,
  fetchLoyaltyFunnel,
  fetchLoyaltyMessages,
} from "./redash-queries";
import { normalizeMid } from "./mid";
import { withSyncRun, runStep } from "./sync-run";
import { mapWithConcurrency } from "./concurrency";

type CreditBreakup = { total?: number; campaigns?: number; loyalty?: number; automations?: number };

async function mergeCreditBreakup(merchantId: string, patch: Partial<CreditBreakup>) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { creditConsumptionBreakup: true },
  });
  const current = (merchant?.creditConsumptionBreakup ?? {}) as CreditBreakup;
  const next: CreditBreakup = { ...current, ...patch };
  next.total = (next.campaigns ?? 0) + (next.loyalty ?? 0) + (next.automations ?? 0);
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { creditConsumptionBreakup: next, momCreditConsumption: next.total },
  });
}

// Redash query 10505's crm_status field is the real CRM license state:
// A=Active, P=Paused, E=Expired. Confirmed by ops — not guessed.
function mapCrmLicenseStatus(code: string): "Active" | "Paused" | "Expired" | "NA" {
  if (code === "A") return "Active";
  if (code === "P") return "Paused";
  if (code === "E") return "Expired";
  return "NA";
}

/**
 * Step 1: identity + CRM/campaign status. This is the only query that returns
 * both merchant_id and brand_id together, so it's the source of truth for
 * creating new Merchant rows — every other query only updates existing ones.
 */
export async function syncCrmAdoption() {
  const rows = await fetchCrmAdoption();
  let count = 0;

  for (const row of rows) {
    const dotpeMid = normalizeMid(row.merchant_id);
    const licenseStatus = mapCrmLicenseStatus(row.crm_status);
    const isActive = licenseStatus === "Active";

    const upsertData = {
      create: {
        dotpeMid,
        ristaBrandId: row.brand_id,
        brandName: row.merchant_name,
        crmEnabledOn: row.crm_enabled_at ? new Date(row.crm_enabled_at) : null,
        crmStatus: licenseStatus,
        crmTarget: "Yes" as const,
        onboarded: isActive ? "Onboarded" as const : "NotOnboarded" as const,
        campaignsSetup: row.total_campaigns ?? 0,
        campaignsUsingRfm: row.campaigns_using_rfm ?? 0,
        campaignsContactsReached: row.total_contacts_reached ?? 0,
        totalContactsReached: row.total_contacts_reached ?? 0,
      },
      update: {
        ristaBrandId: row.brand_id,
        brandName: row.merchant_name,
        crmEnabledOn: row.crm_enabled_at ? new Date(row.crm_enabled_at) : undefined,
        crmStatus: licenseStatus,
        onboarded: isActive ? ("Onboarded" as const) : undefined,
        campaignsSetup: row.total_campaigns ?? 0,
        campaignsUsingRfm: row.campaigns_using_rfm ?? 0,
        campaignsContactsReached: row.total_contacts_reached ?? 0,
        totalContactsReached: row.total_contacts_reached ?? 0,
      },
    };

    try {
      await prisma.merchant.upsert({ where: { dotpeMid }, ...upsertData });
      count++;
    } catch (error) {
      // Rista can reassign a brand_id to a different merchant (e.g. a
      // rebrand/closure); when that happens, our stale row still holds the
      // old mapping and collides with ristaBrandId's unique constraint.
      // Redash is the source of truth here, so clear the old holder and
      // retry once rather than dropping the new owner's sync entirely.
      const isRistaBrandIdConflict =
        row.brand_id &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target as string[] | undefined)?.includes("ristaBrandId");

      if (isRistaBrandIdConflict) {
        try {
          await prisma.merchant.updateMany({
            where: { ristaBrandId: row.brand_id, dotpeMid: { not: dotpeMid } },
            data: { ristaBrandId: null },
          });
          await prisma.merchant.upsert({ where: { dotpeMid }, ...upsertData });
          count++;
          continue;
        } catch (retryError) {
          console.error(
            `syncCrmAdoption: retry after clearing stale ristaBrandId still failed for ${dotpeMid} (${row.merchant_name})`,
            retryError
          );
          continue;
        }
      }

      console.error(`syncCrmAdoption: skipped merchant ${dotpeMid} (${row.merchant_name})`, error);
    }
  }

  return count;
}

/**
 * Step 2: pre/post CRM credit totals. This query only returns the merchant's
 * *name*, not their id, so it can only match existing merchants by brandName
 * (case-insensitive) — it never creates new rows.
 */
export async function syncCreditPrePost() {
  const rows = await fetchCrmCreditPrePost();
  let matched = 0;

  for (const row of rows) {
    try {
      const result = await prisma.merchant.updateMany({
        where: { brandName: { equals: row["Merchant Name"], mode: "insensitive" } },
        data: {
          preCrmCredits: row["Before (₹)"] ?? 0,
          postCrmCredits: row["After (₹)"] ?? 0,
        },
      });
      matched += result.count;
    } catch (error) {
      console.error(`syncCreditPrePost: skipped "${row["Merchant Name"]}"`, error);
    }
  }

  return matched;
}

const CREDIT_BREAKUP_MAX_WEEKS = 13; // ~90 days — covers the dashboard's longest date-range preset

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Step 3: per-merchant weekly credit consumption, split by campaign/
 * automation/loyalty. Query 11147 used to take a "trailing weekCount weeks"
 * cumulative param (requiring a diff between consecutive calls to recover
 * each week's own total), but was changed upstream in Redash to an explicit
 * date_range param — each call now returns that window's own total
 * directly, so this just calls it once per 7-day window from 1..MAX weeks
 * back with no diffing needed. Same per-merchant/per-week MerchantSnapshot
 * shape the WoW trend chart already reads.
 *
 * Unlike the old weekCount param, a date_range window is different on every
 * call (and every day), so Redash can never serve these from a warm cache —
 * each call is a genuinely fresh query execution, measured at ~60s apiece
 * server-side on Redash's end. All 14 windows (13 weekly + the L30 rollup
 * below) are fetched in one fully-parallel batch rather than sequentially or
 * in small batches — Redash handled a 13-way concurrent burst with no
 * errors in testing, and going fully parallel bounds the whole step's
 * wall-clock cost to roughly one query's execution time instead of stacking
 * them, which is what pushed the full sync past Vercel's timeout budget.
 *
 * Also derives creditConsumedL30 from a direct 28-day window read, folded
 * into the same parallel batch instead of a separate trailing call.
 */
export async function syncCreditConsumptionByWeek() {
  const merchants = await prisma.merchant.findMany({ select: { id: true, dotpeMid: true } });
  const merchantIdByMid = new Map(merchants.map((m) => [normalizeMid(m.dotpeMid), m.id]));

  const now = Date.now();
  const weeks = Array.from({ length: CREDIT_BREAKUP_MAX_WEEKS }, (_, i) => i + 1);
  type Request = { kind: "week"; w: number } | { kind: "l30" };
  const requests: Request[] = [...weeks.map((w): Request => ({ kind: "week", w })), { kind: "l30" }];

  const fetched = await mapWithConcurrency(requests, requests.length, async (req) => {
    const [start, end] =
      req.kind === "week"
        ? [new Date(now - req.w * 7 * DAY_MS), new Date(now - (req.w - 1) * 7 * DAY_MS)]
        : [new Date(now - 28 * DAY_MS), new Date(now)];
    const rows = await fetchCreditConsumptionBreakup(start, end);
    return { req, capturedAt: start, rows };
  });

  let written = 0;
  for (const { req, capturedAt, rows } of fetched) {
    if (req.kind === "l30") {
      for (const row of rows) {
        const merchantIdNum = row["Merchant ID"];
        const merchantId = merchantIdByMid.get(normalizeMid(String(merchantIdNum)));
        if (!merchantId) continue;
        try {
          await prisma.merchant.update({
            where: { id: merchantId },
            data: { creditConsumedL30: row["CRM Total (₹)"] ?? 0 },
          });
        } catch (error) {
          console.error(`syncCreditConsumptionByWeek: failed to set creditConsumedL30 for ${merchantIdNum}`, error);
        }
      }
      continue;
    }

    for (const row of rows) {
      const merchantIdNum = row["Merchant ID"];
      const merchantId = merchantIdByMid.get(normalizeMid(String(merchantIdNum)));
      if (!merchantId) continue;

      const fields: Record<string, number> = {
        "creditConsumption.total": row["CRM Total (₹)"] ?? 0,
        "creditConsumption.campaigns": row["Campaign (₹)"] ?? 0,
        "creditConsumption.automations": row["Automation (₹)"] ?? 0,
        "creditConsumption.loyalty": row["Loyalty (₹)"] ?? 0,
      };

      for (const [fieldName, value] of Object.entries(fields)) {
        try {
          await prisma.merchantSnapshot.upsert({
            where: { merchantId_fieldName_capturedAt: { merchantId, fieldName, capturedAt } },
            create: { merchantId, fieldName, value, capturedAt },
            update: { value },
          });
          written++;
        } catch (error) {
          console.error(`syncCreditConsumptionByWeek: skipped ${merchantIdNum}/${fieldName}/week ${req.w}`, error);
        }
      }
    }
  }

  return written;
}

/** Step 4: loyalty program status, enrollment, and points. Update-only. */
export async function syncLoyaltyFunnel() {
  const rows = await fetchLoyaltyFunnel();
  let matched = 0;

  for (const row of rows) {
    const dotpeMid = normalizeMid(row.merchant_id);
    const status = row.status?.toLowerCase().includes("active") ? "Active" : "Inactive";

    try {
      const result = await prisma.merchant.updateMany({
        where: { dotpeMid },
        data: {
          loyaltyProgram: row.program_name,
          loyaltyStatus: status,
          loyaltyPointsEarned: Math.round(row.points_earned ?? 0),
          loyaltyPointsBurned: Math.round(row.points_redeemed ?? 0),
          customerCount: Math.round(row.total_enrolled ?? 0),
        },
      });
      matched += result.count;
    } catch (error) {
      console.error(`syncLoyaltyFunnel: skipped merchant ${dotpeMid}`, error);
    }
  }

  return matched;
}

/** Step 5: loyalty messaging credit spend — folds into the loyalty slice of creditConsumptionBreakup. */
export async function syncLoyaltyMessages() {
  const rows = await fetchLoyaltyMessages();
  let matched = 0;

  for (const row of rows) {
    const dotpeMid = normalizeMid(row.merchant_id);
    try {
      const merchant = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });
      if (!merchant) continue;
      await mergeCreditBreakup(merchant.id, { loyalty: row.cost ?? 0 });
      matched++;
    } catch (error) {
      console.error(`syncLoyaltyMessages: skipped merchant ${dotpeMid}`, error);
    }
  }

  return matched;
}

/**
 * Step 6: automation rules. Multiple rows per merchant (one per rule), so
 * this aggregates client-side before writing.
 */
export async function syncAutomations() {
  const rows = await fetchAutomationPerformance();

  const byMerchant = new Map<
    string,
    { rules: Set<string>; totalSent: number; sendCost: number; earliestActivation: Date | null }
  >();

  for (const row of rows) {
    const dotpeMid = normalizeMid(row.merchant_id);
    const entry = byMerchant.get(dotpeMid) ?? {
      rules: new Set<string>(),
      totalSent: 0,
      sendCost: 0,
      earliestActivation: null as Date | null,
    };
    if (row.rule_status === "active") entry.rules.add(row.event_type);
    entry.totalSent += row.daily_sent ?? 0;
    entry.sendCost += row.send_cost ?? 0;
    if (row.activated_at) {
      const activatedAt = new Date(row.activated_at);
      if (!entry.earliestActivation || activatedAt < entry.earliestActivation) {
        entry.earliestActivation = activatedAt;
      }
    }
    byMerchant.set(dotpeMid, entry);
  }

  let matched = 0;
  for (const [dotpeMid, entry] of byMerchant) {
    try {
      const merchant = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });
      if (!merchant) continue;

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          automationsRules: Array.from(entry.rules),
          automationsTotalSent: Math.round(entry.totalSent),
          automationsActivateDate: entry.earliestActivation,
        },
      });
      await mergeCreditBreakup(merchant.id, { automations: entry.sendCost });
      matched++;
    } catch (error) {
      console.error(`syncAutomations: skipped merchant ${dotpeMid}`, error);
    }
  }

  return matched;
}

/**
 * Portfolio-wide weekly consumed/recharged (query 11078). Pre-synced rather
 * than read live: this query alone can take 30-60s+ against production
 * data, and calling it on every dashboard page load is both slow and a
 * real stability risk for the dev server under a long-held connection.
 */
export async function syncPortfolioTrend() {
  const rows = await fetchCrmWeeklyTrend(12);
  let written = 0;

  for (const row of rows) {
    const week = row["Week Start"];
    if (!week) continue;
    try {
      await prisma.portfolioTrend.upsert({
        where: { week },
        create: {
          week,
          consumed: row["Total Consumed (₹)"] ?? 0,
          recharged: row["Total Recharged (₹)"] ?? 0,
        },
        update: {
          consumed: row["Total Consumed (₹)"] ?? 0,
          recharged: row["Total Recharged (₹)"] ?? 0,
        },
      });
      written++;
    } catch (error) {
      console.error(`syncPortfolioTrend: skipped week ${week}`, error);
    }
  }

  return written;
}

// Everything except creditConsumptionByWeek — that step alone has measured
// ~220s even fully parallelized (Redash's own per-query execution time, not
// something client-side concurrency can shrink further), while these other
// six steps combined take well under a minute. Splitting it into its own
// cron (syncRedashCreditWeekly, below) means the daily light-steps run
// finishes comfortably inside Vercel's real enforced timeout — which held
// firm at roughly 300s regardless of this route's own `maxDuration` setting,
// so the fix has to be "do less work per request," not "ask for more time."
export async function syncRedashLight() {
  return withSyncRun("REDASH", async () => ({
    crmAdoption: await runStep("crmAdoption", syncCrmAdoption),
    creditPrePost: await runStep("creditPrePost", syncCreditPrePost),
    loyaltyFunnel: await runStep("loyaltyFunnel", syncLoyaltyFunnel),
    loyaltyMessages: await runStep("loyaltyMessages", syncLoyaltyMessages),
    automations: await runStep("automations", syncAutomations),
    portfolioTrend: await runStep("portfolioTrend", syncPortfolioTrend),
  }));
}

// Runs only the slow step, in its own SyncRun / cron invocation with a full
// budget to itself instead of competing with the six lighter steps above.
export async function syncRedashCreditWeekly() {
  return withSyncRun("REDASH", async () => ({
    creditConsumptionByWeek: await runStep("creditConsumptionByWeek", syncCreditConsumptionByWeek),
  }));
}

// Full manual sync (the "Sync now" button) — keeps all seven steps in one
// call since it's user-triggered and retriable, unlike the daily cron.
export async function syncRedash() {
  return withSyncRun("REDASH", async () => ({
    crmAdoption: await runStep("crmAdoption", syncCrmAdoption),
    creditPrePost: await runStep("creditPrePost", syncCreditPrePost),
    creditConsumptionByWeek: await runStep("creditConsumptionByWeek", syncCreditConsumptionByWeek),
    loyaltyFunnel: await runStep("loyaltyFunnel", syncLoyaltyFunnel),
    loyaltyMessages: await runStep("loyaltyMessages", syncLoyaltyMessages),
    automations: await runStep("automations", syncAutomations),
    portfolioTrend: await runStep("portfolioTrend", syncPortfolioTrend),
  }));
}
