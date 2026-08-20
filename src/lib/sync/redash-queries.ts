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

// Returns one row per merchant totaled over [start, end]. The query was
// originally a "trailing weekCount weeks" cumulative param (weekCount, text
// type) but was changed upstream in Redash to an explicit date_range param —
// passing weekCount now 400s with "incompatible with their definitions".
// An explicit window is actually simpler for us: each call already returns
// that window's own total, no cumulative-diffing needed.
export async function fetchCreditConsumptionBreakup(start: Date, end: Date) {
  const rows = await runRedashQuery(REDASH_QUERY_IDS.creditConsumptionBreakup, {
    date_range: { start: `${isoDate(start)} 00:00:00`, end: `${isoDate(end)} 23:59:59` },
  });
  return rows as unknown as CreditConsumptionBreakupRow[];
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
