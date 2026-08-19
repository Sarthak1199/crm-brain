// Plain constants only — no fetch/runtime logic here, so this is safe to
// pull into client bundles (via source-links.ts) without dragging in
// server-only sync code.
export const REDASH_QUERY_IDS = {
  crmAdoption: 10505, // CRM <> Overview Metrics
  crmWeeklyTrend: 11078, // CRM - Overall Weekly Trend (portfolio-wide, informational only)
  crmCreditPrePost: 11018, // CRM - Marketing Credit Pre/Post Activation
  crmCreditMonthly: 11015, // CRM - Month Overview (Consumed vs Recharged), per merchant_id
  loyaltyFunnel: 10921, // Loyalty - Point Program Funnel
  loyaltyMessages: 11054, // Loyalty : Messages tracking
  automationPerRule: 10990, // Per-rule Automation Performance
} as const;
