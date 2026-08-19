// Maps Redash's `event_type` slugs (per-rule automation query) to the
// display names ops actually recognizes. Source: query 10990's distinct
// event_type values, verified live — not guessed.
const AUTOMATION_RULE_LABELS: Record<string, string> = {
  new_customer: "New customer",
  post_transaction_feedback: "Post-transaction feedback",
  winback_without_loyalty: "Winback (no loyalty)",
  winback_with_loyalty: "Winback (loyalty)",
  high_value_order: "High value order",
  order_milestone: "Order milestone",
  negative_feedback: "Negative feedback",
};

export function automationRuleLabel(eventType: string): string {
  return AUTOMATION_RULE_LABELS[eventType] ?? eventType;
}
