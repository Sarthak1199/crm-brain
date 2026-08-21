import { runRedashQuery } from "@/lib/redash";
import { REDASH_QUERY_IDS } from "./redash-query-ids";

export { REDASH_QUERY_IDS } from "./redash-query-ids";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Redash's `datetime-range-with-seconds` params are passed as {start, end}. */
function dateRangeParams(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    Date: { start: `${isoDate(start)} 00:00:00`, end: `${isoDate(end)} 23:59:59` },
  };
}

export type CrmAdoptionRow = {
  merchant_id: number;
  brand_id: string | null;
  merchant_name: string;
  crm_enabled_at: string | null;
  crm_status: string;
  total_campaigns: number;
  campaigns_using_rfm: number;
  total_contacts_reached: number;
};

// Wide by default: this is the only query that creates Merchant rows, so a
// narrow window (e.g. "last 30 days") silently starves the whole roster down
// to whoever was touched recently. 400 days covers essentially the full
// crm_merchants history without being unbounded.
export async function fetchCrmAdoption(days = 400) {
  const rows = await runRedashQuery(REDASH_QUERY_IDS.crmAdoption, dateRangeParams(days));
  return rows as unknown as CrmAdoptionRow[];
}

export type CrmWeeklyTrendRow = {
  "Week Start": string;
  "Active Merchants": number;
  "Total Consumed (₹)": number;
  "Total Recharged (₹)": number;
  "Net Change (₹)": number;
};

/** Portfolio-wide (not per-merchant) — kept for a future portfolio trend widget, not persisted today. */
export async function fetchCrmWeeklyTrend(weekCount = 12) {
  const rows = await runRedashQuery(REDASH_QUERY_IDS.crmWeeklyTrend, {
    weekCount: String(weekCount),
  });
  return rows as unknown as CrmWeeklyTrendRow[];
}

export type CrmCreditPrePostRow = {
  "Merchant Name": string;
  "CRM Activated": string;
  "Before (₹)": number;
  "After (₹)": number;
  "Balance (₹)": number;
};

export async function fetchCrmCreditPrePost() {
  const rows = await runRedashQuery(REDASH_QUERY_IDS.crmCreditPrePost, {});
  return rows as unknown as CrmCreditPrePostRow[];
}

export type CreditConsumptionBreakupRow = {
  "Merchant Name": string;
  "Merchant ID": number;
  "CRM Total (₹)": number;
  "Campaign (₹)": number;
  "Automation (₹)": number;
  "Loyalty (₹)": number;
};

// Returns one row per merchant totaled over [start, end], both treated as
// calendar dates the query includes in full — it does
// `< DATE_ADD('{{date_range.end}}', INTERVAL 1 DAY)`, which is already the
// correct way to make `end` inclusive of its whole day. Callers whose `end`
// is really an EXCLUSIVE boundary shared with an adjacent window (e.g. a
// week's end == the next week's start) must pass `end` minus a day
// themselves — otherwise the boundary day gets pulled into both windows
// and double-counted (confirmed via direct Redash pulls: summing weeks
// using the raw shared boundary overcounted some actively-transacting
// merchants by 10-55% vs a single equivalent-span query). Callers whose
// `end` is a literal "as of now" cutoff (e.g. a trailing-N-days figure)
// should keep passing it unadjusted, since DATE_ADD's inclusive-of-today
// behavior is exactly what they want.
//
// Also plain dates only (no time-of-day) for the same DATE_ADD reason —
// appending "23:59:59" on top would push the boundary a further ~23 hours
// into the next day.
//
// max_age: 0 forces a fresh recompute rather than a possibly-stale cached
// result for this (query, params) pair — this backs a P0 financial-accuracy
// figure, so it shouldn't ever serve a result older than the call itself.
export async function fetchCreditConsumptionBreakup(start: Date, end: Date) {
  const rows = await runRedashQuery(
    REDASH_QUERY_IDS.creditConsumptionBreakup,
    { date_range: { start: isoDate(start), end: isoDate(end) } },
    0
  );
  return rows as unknown as CreditConsumptionBreakupRow[];
}

export type CustomerReachBreakupRow = {
  "Merchant Name": string;
  "Merchant ID": number;
  "Campaign Reach": number | null;
  "Automation Reach": number | null;
  "Loyalty Reach": number | null;
};

// Distinct customers reached per channel over [start, end] — a headcount
// (query 11148), not the ₹ spend that 11147 returns. Same date_range
// shape and boundary semantics as fetchCreditConsumptionBreakup.
export async function fetchCustomerReachBreakup(start: Date, end: Date) {
  const rows = await runRedashQuery(
    REDASH_QUERY_IDS.customerReachBreakup,
    { date_range: { start: isoDate(start), end: isoDate(end) } },
    0
  );
  return rows as unknown as CustomerReachBreakupRow[];
}

export type LoyaltyFunnelRow = {
  program_name: string;
  status: string;
  merchant_id: number;
  merchant_name: string;
  total_enrolled: number;
  points_earned: number;
  points_redeemed: number;
};

export async function fetchLoyaltyFunnel(days = 90) {
  const rows = await runRedashQuery(REDASH_QUERY_IDS.loyaltyFunnel, dateRangeParams(days));
  return rows as unknown as LoyaltyFunnelRow[];
}

export type LoyaltyMessagesRow = {
  merchant_id: number;
  merchant_name: string;
  cost: number;
  total_messages: number;
};

export async function fetchLoyaltyMessages(days = 90) {
  const rows = await runRedashQuery(REDASH_QUERY_IDS.loyaltyMessages, dateRangeParams(days));
  return rows as unknown as LoyaltyMessagesRow[];
}

export type AutomationRuleRow = {
  automation_key: string;
  event_type: string;
  rule_status: string;
  merchant_id: number;
  merchant_name: string;
  activated_at: string | null;
  daily_sent: number;
  send_cost: number;
};

export async function fetchAutomationPerformance(days = 90) {
  const rows = await runRedashQuery(REDASH_QUERY_IDS.automationPerRule, dateRangeParams(days));
  return rows as unknown as AutomationRuleRow[];
}
