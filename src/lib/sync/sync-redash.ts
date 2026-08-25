import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  fetchAutomationPerformance,
  fetchCrmAdoption,
  fetchCreditConsumptionBreakup,
  fetchCustomerReachBreakup,
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

  // One row at a time here meant a full sequential DB round-trip per
  // merchant — with merchant count grown since this was written, that's
  // what pushed the whole "Sync now" button (all six light steps run
  // sequentially) past its 240s budget with nothing to show for it. Each
  // row's own retry-on-conflict logic is unaffected by running concurrently
  // — a genuine ristaBrandId race just falls through to the same retry
  // path, and Postgres serializes the actual conflicting writes.
  const results = await mapWithConcurrency(rows, 15, async (row) => {
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
      return true;
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
          return true;
        } catch (retryError) {
          console.error(
            `syncCrmAdoption: retry after clearing stale ristaBrandId still failed for ${dotpeMid} (${row.merchant_name})`,
            retryError
          );
          return false;
        }
      }

      console.error(`syncCrmAdoption: skipped merchant ${dotpeMid} (${row.merchant_name})`, error);
      return false;
    }
  });

  return results.filter(Boolean).length;
}

/**
 * Step 2: pre/post CRM credit totals. This query only returns the merchant's
 * *name*, not their id, so it can only match existing merchants by brandName
 * (case-insensitive) — it never creates new rows.
 */
export async function syncCreditPrePost() {
  const rows = await fetchCrmCreditPrePost();

  const results = await mapWithConcurrency(rows, 15, async (row) => {
    try {
      const result = await prisma.merchant.updateMany({
        where: { brandName: { equals: row["Merchant Name"], mode: "insensitive" } },
        data: {
          preCrmCredits: row["Before (₹)"] ?? 0,
          postCrmCredits: row["After (₹)"] ?? 0,
        },
      });
      return result.count;
    } catch (error) {
      console.error(`syncCreditPrePost: skipped "${row["Merchant Name"]}"`, error);
      return 0;
    }
  });

  return results.reduce((a, b) => a + b, 0);
}

const CREDIT_BREAKUP_MAX_WEEKS = 13; // ~90 days — covers the dashboard's longest date-range preset

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Fixed reference point (a Monday, UTC midnight) for anchoring week
// boundaries — see currentWeekAnchor() below for why this matters.
const WEEK_ANCHOR_EPOCH_MS = Date.UTC(2020, 0, 6);

// Floors "now" to a fixed weekly grid instead of using `now` directly as
// the window's own edge. This is what makes repeated syncs within the same
// real calendar week collide on the same MerchantSnapshot upsert key
// (merchantId, fieldName, capturedAt) and overwrite each other, instead of
// each accumulating a brand-new row.
//
// The previous version computed each week's start as `now - w*7*DAY_MS`
// using the live clock at call time. Since `now` drifts continuously, two
// syncs run minutes (or even the same day) apart never produced the exact
// same capturedAt — every "Sync now" click and every daily cron run wrote
// a whole new set of ~13-per-field rows on top of the previous ones rather
// than replacing them. dashboard-data.ts's date-range sums then added
// every one of those duplicates together, which is the actual cause of
// wildly inflated numbers reported for specific merchants (e.g. a
// merchant's 30-day loyalty figure coming out ~13x too high) — not a wrong
// Redash query, param name, or category mislabeling; the query and field
// mapping were both correct, but the same real week's true total got
// counted once per historical sync run.
function currentWeekAnchor(): number {
  const weeksSinceEpoch = Math.floor((Date.now() - WEEK_ANCHOR_EPOCH_MS) / WEEK_MS);
  return WEEK_ANCHOR_EPOCH_MS + weeksSinceEpoch * WEEK_MS;
}

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

  // Weekly windows are anchored to a fixed grid (see currentWeekAnchor) so
  // repeated syncs collide and overwrite instead of accumulating duplicate
  // rows. creditConsumedL30 isn't stored as a MerchantSnapshot — it's
  // always a plain overwrite on Merchant — so it uses the real clock and
  // stays a genuine trailing-28-days-as-of-today figure, not floored to
  // the weekly grid.
  const weekAnchor = currentWeekAnchor();
  const realNow = Date.now();
  const weeks = Array.from({ length: CREDIT_BREAKUP_MAX_WEEKS }, (_, i) => i + 1);
  type Request = { kind: "week"; w: number } | { kind: "l30" };
  const requests: Request[] = [...weeks.map((w): Request => ({ kind: "week", w })), { kind: "l30" }];

  const fetched = await mapWithConcurrency(requests, requests.length, async (req) => {
    const start =
      req.kind === "week" ? new Date(weekAnchor - req.w * WEEK_MS) : new Date(realNow - 28 * DAY_MS);
    // fetchCreditConsumptionBreakup's `end` is inclusive of its whole
    // calendar day. For a week, the natural end (weekAnchor - (w-1)*WEEK_MS)
    // is EXCLUSIVE — it's also the next week's start — so it must be backed
    // off a day, or that boundary day gets pulled into (and double-counted
    // across) both adjacent weeks. l30's end is a literal "as of now" cutoff,
    // not a shared boundary, so it's left as-is.
    const queryEnd =
      req.kind === "week" ? new Date(weekAnchor - (req.w - 1) * WEEK_MS - DAY_MS) : new Date(realNow);
    const rows = await fetchCreditConsumptionBreakup(start, queryEnd);
    return { req, capturedAt: start, rows };
  });

  // One row at a time here would mean thousands of serial DB round-trips
  // (merchants × 4 fields × 13 weeks) — that write phase, not the parallel
  // Redash fetch above, was what actually blew past maxDuration and left
  // later weeks unwritten. Flatten to individual upsert jobs and run them
  // with bounded concurrency instead.
  const l30Jobs: (() => Promise<void>)[] = [];
  const snapshotJobs: (() => Promise<boolean>)[] = [];

  for (const { req, capturedAt, rows } of fetched) {
    if (req.kind === "l30") {
      for (const row of rows) {
        const merchantIdNum = row["Merchant ID"];
        const merchantId = merchantIdByMid.get(normalizeMid(String(merchantIdNum)));
        if (!merchantId) continue;
        l30Jobs.push(async () => {
          try {
            await prisma.merchant.update({
              where: { id: merchantId },
              data: { creditConsumedL30: row["CRM Total (₹)"] ?? 0 },
            });
          } catch (error) {
            console.error(`syncCreditConsumptionByWeek: failed to set creditConsumedL30 for ${merchantIdNum}`, error);
          }
        });
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
        snapshotJobs.push(async () => {
          try {
            await prisma.merchantSnapshot.upsert({
              where: { merchantId_fieldName_capturedAt: { merchantId, fieldName, capturedAt } },
              create: { merchantId, fieldName, value, capturedAt },
              update: { value },
            });
            return true;
          } catch (error) {
            console.error(`syncCreditConsumptionByWeek: skipped ${merchantIdNum}/${fieldName}/week ${req.w}`, error);
            return false;
          }
        });
      }
    }
  }

  await mapWithConcurrency(l30Jobs, 20, (job) => job());
  const results = await mapWithConcurrency(snapshotJobs, 20, (job) => job());
  return results.filter(Boolean).length;
}

/**
 * Per-merchant weekly customers-reached, split by channel — same shape and
 * week-anchoring as syncCreditConsumptionByWeek, but from query 11148
 * (distinct customer counts, not ₹ spend). Backs the "Customers Reached"
 * chart, which previously read lifetime/mismatched fields (total_enrolled,
 * a cumulative automations-sent counter, a non-date-filterable contacts
 * total) that neither reflected the selected date range nor consistently
 * meant "distinct customers reached."
 */
export async function syncCustomersReachedByWeek() {
  const merchants = await prisma.merchant.findMany({ select: { id: true, dotpeMid: true } });
  const merchantIdByMid = new Map(merchants.map((m) => [normalizeMid(m.dotpeMid), m.id]));

  const weekAnchor = currentWeekAnchor();
  const weeks = Array.from({ length: CREDIT_BREAKUP_MAX_WEEKS }, (_, i) => i + 1);

  const fetched = await mapWithConcurrency(weeks, weeks.length, async (w) => {
    const start = new Date(weekAnchor - w * WEEK_MS);
    // See syncCreditConsumptionByWeek for why this boundary is backed off a
    // day — it's shared with the next week and would otherwise be
    // double-counted across both.
    const queryEnd = new Date(weekAnchor - (w - 1) * WEEK_MS - DAY_MS);
    const rows = await fetchCustomerReachBreakup(start, queryEnd);
    return { capturedAt: start, rows };
  });

  // See syncCreditConsumptionByWeek for why this is batched with bounded
  // concurrency rather than one serial `await` per row.
  const snapshotJobs: (() => Promise<boolean>)[] = [];

  for (const { capturedAt, rows } of fetched) {
    for (const row of rows) {
      const merchantIdNum = row["Merchant ID"];
      const merchantId = merchantIdByMid.get(normalizeMid(String(merchantIdNum)));
      if (!merchantId) continue;

      const campaigns = row["Campaign Reach"] ?? 0;
      const automations = row["Automation Reach"] ?? 0;
      const loyalty = row["Loyalty Reach"] ?? 0;
      const fields: Record<string, number> = {
        "customersReached.total": campaigns + automations + loyalty,
        "customersReached.campaigns": campaigns,
        "customersReached.automations": automations,
        "customersReached.loyalty": loyalty,
      };

      for (const [fieldName, value] of Object.entries(fields)) {
        snapshotJobs.push(async () => {
          try {
            await prisma.merchantSnapshot.upsert({
              where: { merchantId_fieldName_capturedAt: { merchantId, fieldName, capturedAt } },
              create: { merchantId, fieldName, value, capturedAt },
              update: { value },
            });
            return true;
          } catch (error) {
            console.error(`syncCustomersReachedByWeek: skipped ${merchantIdNum}/${fieldName}`, error);
            return false;
          }
        });
      }
    }
  }

  const results = await mapWithConcurrency(snapshotJobs, 20, (job) => job());
  return results.filter(Boolean).length;
}

/** Step 4: loyalty program status, enrollment, and points. Update-only. */
export async function syncLoyaltyFunnel() {
  const rows = await fetchLoyaltyFunnel();

  const results = await mapWithConcurrency(rows, 15, async (row) => {
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
      return result.count;
    } catch (error) {
      console.error(`syncLoyaltyFunnel: skipped merchant ${dotpeMid}`, error);
      return 0;
    }
  });

  return results.reduce((a, b) => a + b, 0);
}

/** Step 5: loyalty messaging credit spend — folds into the loyalty slice of creditConsumptionBreakup. */
export async function syncLoyaltyMessages() {
  const rows = await fetchLoyaltyMessages();

  // Concurrency here is safe as long as every merchant_id in this query's
  // rows is unique (mergeCreditBreakup does its own read-modify-write on
  // Merchant.creditConsumptionBreakup, which would race if the same
  // merchant were touched twice at once — but that can only happen across
  // *different* sync steps sharing a merchant, not within a single row set
  // from one query, so syncRedashLight still runs this step-to-step
  // sequentially rather than in parallel with syncAutomations).
  const results = await mapWithConcurrency(rows, 15, async (row) => {
    const dotpeMid = normalizeMid(row.merchant_id);
    try {
      const merchant = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });
      if (!merchant) return false;
      await mergeCreditBreakup(merchant.id, { loyalty: row.cost ?? 0 });
      return true;
    } catch (error) {
      console.error(`syncLoyaltyMessages: skipped merchant ${dotpeMid}`, error);
      return false;
    }
  });

  return results.filter(Boolean).length;
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

  const results = await mapWithConcurrency(Array.from(byMerchant), 15, async ([dotpeMid, entry]) => {
    try {
      const merchant = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });
      if (!merchant) return false;

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          automationsRules: Array.from(entry.rules),
          automationsTotalSent: Math.round(entry.totalSent),
          automationsActivateDate: entry.earliestActivation,
        },
      });
      await mergeCreditBreakup(merchant.id, { automations: entry.sendCost });
      return true;
    } catch (error) {
      console.error(`syncAutomations: skipped merchant ${dotpeMid}`, error);
      return false;
    }
  });

  return results.filter(Boolean).length;
}

/**
 * Portfolio-wide weekly consumed/recharged (query 11078). Pre-synced rather
 * than read live: this query alone can take 30-60s+ against production
 * data, and calling it on every dashboard page load is both slow and a
 * real stability risk for the dev server under a long-held connection.
 */
export async function syncPortfolioTrend() {
  const rows = await fetchCrmWeeklyTrend(12);

  const results = await mapWithConcurrency(rows, 12, async (row) => {
    const week = row["Week Start"];
    if (!week) return false;
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
      return true;
    } catch (error) {
      console.error(`syncPortfolioTrend: skipped week ${week}`, error);
      return false;
    }
  });

  return results.filter(Boolean).length;
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

// Same cost profile as syncRedashCreditWeekly (13 parallel Redash calls,
// ~220s) — its own cron/SyncRun for the same reason, and deliberately not
// part of the interactive "Sync now" button either.
export async function syncRedashCustomersReachedWeekly() {
  return withSyncRun("REDASH", async () => ({
    customersReachedByWeek: await runStep("customersReachedByWeek", syncCustomersReachedByWeek),
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
