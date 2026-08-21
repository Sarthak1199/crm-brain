// Fixed sets of insertable placeholders for message template text — exact
// lists as specified, not derived from any one template's own placeholder
// syntax (which varies row to row in the source sheet). The variable set
// shown in the template form depends on the selected Category: Loyalty and
// Automation each have their own list; Campaign and Utility have none.
export const LOYALTY_VARIABLES = [
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

export const AUTOMATION_VARIABLES = [
  "{first_name}",
  "{phone}",
  "{order_id}",
  "{amount}",
  "{order_time}",
  "{service_type}",
  "{merchant_id}",
  "{automation_type}",
  "{feedback_link}",
  "{rating}",
  "{outlet_wise_gmb_link}",
  "{branch_name}",
  "{brand_name}",
  "{reward_label}",
  "{validity}",
  "{expiry_days}",
  "{expiry_date}",
  "{coupon_expires_at}",
  "{coupon_code}",
  "{delay_value}",
  "{delay_unit}",
  "{min_lifetime_visits}",
  "{min_lifetime_spend}",
  "{min_last_order_value}",
  "{spend_threshold}",
  "{reminder_days_before}",
  "{lapse_days}",
  "{POS_DEAL}",
  "{mediaURL}",
] as const;

/** Category → its variable set. Campaign/Utility (and unset) have none. */
export function variablesForCategory(category: string): readonly string[] {
  if (category === "Loyalty") return LOYALTY_VARIABLES;
  if (category === "Automation") return AUTOMATION_VARIABLES;
  return [];
}
