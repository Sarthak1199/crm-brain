// Fixed set of insertable placeholders for message template text — exact
// list as specified, not derived from any one template's own placeholder
// syntax (which varies row to row in the source sheet).
export const TEMPLATE_VARIABLES = [
  "{customer_name}",
  "{program_name}",
  "{collectible_name}",
  "{active_collectible}",
  "{collectible_expiry}",
  "{reward_name}",
  "{reward_expiry_date}",
  "{reward_expiry_in}",
  "{reward_coupon}",
  "{program_link}",
  "{account_link}",
  "{points}",
  "{total_points}",
  "{store_name}",
  "{expiry_date}",
  "{earn_rate}",
  "{earn_threshold}",
  "{max_discount}",
  "{balance_inr_value}",
  "{redeemed_inr_value}",
  "{expiry_days}",
  "{threshold_points}",
] as const;
