import { prisma } from "@/lib/prisma";
import {
  fetchAutomationPerformance,
  fetchCrmAdoption,
  fetchCrmCreditMonthly,
  fetchCrmCreditPrePost,
  fetchCrmWeeklyTrend,
  fetchLoyaltyFunnel,
  fetchLoyaltyMessages,
} from "./redash-queries";
import { normalizeMid } from "./mid";
import { withSyncRun, runStep } from "./sync-run";

type CreditBreakup = { total?: number; campaigns?: number; loyalty?: number; automations?: number };

function monthStart(month: string) {
  // "2026-07" -> 2026-07-01
  return new Date(`${month}-01T00:00:00Z`);
}

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

    try {
      await prisma.merchant.upsert({
        where: { dotpeMid },
        create: {
          dotpeMid,
          ristaBrandId: row.brand_id,
          brandName: row.merchant_name,
          crmEnabledOn: row.crm_enabled_at ? new Date(row.crm_enabled_at) : null,
          crmStatus: licenseStatus,
          crmTarget: "Yes",
          onboarded: isActive ? "Onboarded" : "NotOnboarded",
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
          onboarded: isActive ? "Onboarded" : undefined,
          campaignsSetup: row.total_campaigns ?? 0,
          campaignsUsingRfm: row.campaigns_using_rfm ?? 0,
          campaignsContactsReached: row.total_contacts_reached ?? 0,
          totalContactsReached: row.total_contacts_reached ?? 0,
        },
      });
      count++;
    } catch (error) {
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

/**
 * Step 3: per-merchant credit consumption history for the trend sparkline.
 * NOTE: this Redash query buckets by *month*, not week — there is no
 * per-merchant weekly credit query today, so MerchantSnapshot rows are
 * written at monthly cadence (closest real granularity available).
 *
 * Also derives creditConsumedL30: the most recent month's "Consumed (₹)" as
 * the closest available proxy for "last 30 days" (no daily/weekly-granular
 * credit query exists to compute a true rolling 30-day figure).
 */
export async function syncCreditMonthlySnapshots() {
  const merchants = await prisma.merchant.findMany({ select: { id: true, dotpeMid: true } });
  let written = 0;

  for (const m of merchants) {
    const merchantId = Number(m.dotpeMid);
    if (!Number.isFinite(merchantId)) continue;

    let rows;
    try {
      rows = await fetchCrmCreditMonthly(merchantId);
    } catch (error) {
      console.error(`syncCreditMonthlySnapshots: skipped merchant ${merchantId}`, error);
      continue;
    }

    let latestMonth: string | null = null;
    let latestConsumed = 0;

    for (const row of rows) {
      const capturedAt = monthStart(row.Month);
      try {
        await prisma.merchantSnapshot.upsert({
          where: {
            merchantId_fieldName_capturedAt: {
              merchantId: m.id,
              fieldName: "creditConsumption.total",
              capturedAt,
            },
          },
          create: {
            merchantId: m.id,
            fieldName: "creditConsumption.total",
            value: row["Consumed (₹)"] ?? 0,
            capturedAt,
          },
          update: {
            value: row["Consumed (₹)"] ?? 0,
          },
        });
        written++;

        if (!latestMonth || row.Month > latestMonth) {
          latestMonth = row.Month;
          latestConsumed = row["Consumed (₹)"] ?? 0;
        }
      } catch (error) {
        console.error(`syncCreditMonthlySnapshots: skipped ${merchantId}/${row.Month}`, error);
      }
    }

    if (latestMonth) {
      try {
        await prisma.merchant.update({
          where: { id: m.id },
          data: { creditConsumedL30: latestConsumed },
        });
      } catch (error) {
        console.error(`syncCreditMonthlySnapshots: failed to set creditConsumedL30 for ${merchantId}`, error);
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

export async function syncRedash() {
  return withSyncRun("REDASH", async () => ({
    crmAdoption: await runStep("crmAdoption", syncCrmAdoption),
    creditPrePost: await runStep("creditPrePost", syncCreditPrePost),
    creditMonthlySnapshots: await runStep("creditMonthlySnapshots", syncCreditMonthlySnapshots),
    loyaltyFunnel: await runStep("loyaltyFunnel", syncLoyaltyFunnel),
    loyaltyMessages: await runStep("loyaltyMessages", syncLoyaltyMessages),
    automations: await runStep("automations", syncAutomations),
    portfolioTrend: await runStep("portfolioTrend", syncPortfolioTrend),
  }));
}
