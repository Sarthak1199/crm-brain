// Plain constants only — no fetch/runtime logic here, so this is safe to
// pull into client bundles (via source-links.ts) without dragging in
// server-only sync code.
export const REDASH_QUERY_IDS = {
  crmAdoption: 10505, // CRM <> Overview Metrics
  crmWeeklyTrend: 11078, // CRM - Overall Weekly Trend (portfolio-wide, informational only)
  crmCreditPrePost: 11018, // CRM - Marketing Credit Pre/Post Activation
  creditConsumptionBreakup: 11147, // CRM Credit Consumption Breakup — total/campaign/automation/loyalty (₹), per merchant_id, date_range
  customerReachBreakup: 11148, // CRM Customer Reach Breakup — distinct customers reached per channel (count, not ₹), per merchant_id, date_range
  loyaltyFunnel: 10921, // Loyalty - Point Program Funnel
  loyaltyMessages: 11054, // Loyalty : Messages tracking
  automationPerRule: 10990, // Per-rule Automation Performance
  // "DotPe Grain" — wide per-merchant table (123 columns, no params), one
  // row per Dotpe_Merchant_ID. Feeds the Licenses section (Has_Rista/
  // Has_Dotpe_Orders/Has_WABA/Has_CRM/Has_Loyalty), Customers_Acquired
  // (Consumption Breakdown), and Branches_Transacting_POS_L90 (transacting
  // branches) — all three come from this one query, not separate sources.
  mxGrain: 11166,
} as const;
