// Re-import of the "Message templates" Google Sheet under the exact
// category/channel/handle mapping given directly by ops (not re-derived
// heuristically from sheet columns like the first import was — this
// mapping was hand-verified row-by-row against the live sheet, see the
// session that produced this file for the verification transcript).
//
// Source: https://docs.google.com/spreadsheets/d/1DkljE_csKY0w4R7WkNErac4WUR5wRSlCR304HDG2Tus
//
// Automation | SMS: exactly the 14 named events, SMS row only (their
// WhatsApp counterparts in the same tab are deliberately excluded — the
// spec names "Channel: SMS" for this whole group, and the 14 named events
// match the sheet's 14 SMS rows 1:1). Each event's "template without deal"
// column is skipped when it's the literal placeholder text "NA" (no
// without-deal variant exists for that event) rather than importing "NA"
// as if it were real message text.
//
// Utility | WhatsApp and Loyalty | WhatsApp/SMS: single-template rows from
// the "Loyalty and others" tab, dealType defaulted to WithoutDeal since
// none of these contain deal/coupon language. Handle=RistaByDotpe only for
// Low Balance / No Balance, per the sheet's own comment ("to be approved on
// Rista by DotPe account only").
//
// The "Point Loyalty" 3-row block (sheet rows 22/23/25 in "Loyalty and
// others") is entirely empty — no event name, no template text — so there
// is nothing to import for it; flagged here and in the ship report rather
// than silently dropped.

import { PrismaClient, TemplateChannel, TemplateDealType, TemplateCategory, TemplateHandle } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  channel: TemplateChannel;
  dealType: TemplateDealType;
  category: TemplateCategory;
  handle?: TemplateHandle;
  messageText: string;
};

const AUTOMATION_SMS: { event: string; withDeal: string; withoutDeal: string | null }[] = [
  {
    event: "New Customer — First Transaction",
    withDeal:
      "Welcome to {brand_name}/our brand, {first_name}/phone number!  \nUse code {coupon_code} on your next visit. Valid for {validity} days.",
    withoutDeal: "Welcome to {brand_name}, {first_name}! Great to have you. We hope to see you again soon!",
  },
  {
    event: "New Customer — No Return",
    withDeal:
      "Hi {first_name}/there\nMiss you at {brand_name}! It's been a while since your last visit. Use code {coupon_code} on your next order. Valid for {expiry_days} days. \nSee you soon!",
    withoutDeal: "Hi {first_name}, miss you at {brand_name}! It's been a while. Come back and visit us again soon!",
  },
  {
    event: "Order Milestone",
    withDeal:
      "Congrats {first_name}/phone number! \nYour {nth} order with {brand_name} unlocked a deal. Use code {coupon_code}. Expires in {N} days.",
    withoutDeal: "Congrats {first_name}! Your {nth} order with {brand_name} is a milestone. Thank you for being a loyal customer!",
  },
  {
    event: "High-Value Order (with deal)",
    withDeal: "Thanks {first_name/phone number}! Your order at {brand_name} unlocked a deal. Use code {coupon_code}. Valid for {validity} days.",
    withoutDeal: "Thanks {first_name}! Big order noted at {brand_name}. We appreciate your love. See you soon!",
  },
  {
    event: "Coupon Expiry",
    withDeal: "Reminder {first_name}/phone number: Your coupon at {brand_name} expires in {X} days. Code: {coupon_code}. Use it before it expires!",
    withoutDeal: null, // sheet: "NA"
  },
  {
    event: "At-Risk",
    withDeal:
      "Hi {first_name}/there, it's been a while since your last visit to {brand_name}/our restaurant. Use code {coupon_code} to get an exclusive offer. Valid for {validity} days.",
    withoutDeal: "Hi {first_name}, it's been a while since your last visit to {brand_name}. We miss you - come back soon!",
  },
  {
    event: "Win-Back - Without Loyalty",
    withDeal:
      "Hi {first_name}/there, it's been a while since your last visit to {brand_name}. Use code {coupon_code} to get an exclusive offer. Valid for {validity} days.",
    withoutDeal: "Hi {first_name}, it's been a while since your last visit to {brand_name}. We miss you - come back soon!",
  },
  {
    event: "Win-Back — With Loyalty (Point)",
    withDeal:
      "Hi {first_name}, it's been a while since your last visit to {brand_name}. We have added {reward_points} bonus points to your loyalty account. Come back soon for more!",
    withoutDeal: null, // sheet: "NA"
  },
  {
    event: "Win-Back — With Loyalty (Visit)",
    withDeal:
      'Hey {first_name} \nWe miss you at {brand_name}! It\'s been a while. We\'ve added a reward, "{Reward_label}" to your account as a part of the {program_name}. Visit us to redeem it!',
    withoutDeal: null, // sheet: "NA"
  },
  {
    event: "Post-Transaction Feedback",
    withDeal: "Hey {first_name}, thanks for ordering from {brand_name}! Rate your experience: {feedback_link} & get a free reward: {reward_label}. Thank you!",
    withoutDeal: "Hey {first_name}, thanks for ordering from {brand_name}! Please rate your experience: {feedback_link}. Thank you!",
  },
  {
    event: "Feedback - Positive",
    withDeal: "Thanks {first_name}! Love your feedback on {brand_name}. Share it on Google too: {review_link}. Means a lot!",
    withoutDeal: null, // sheet: "NA"
  },
  {
    event: "Feedback — Negative",
    withDeal: "Hi {first_name}, sorry about your visit to {brand_name}. Tell us what went wrong: {feedback_form_link}. We'll make it right.",
    withoutDeal: "Hi {first_name}, sorry {brand_name} didn't meet expectations. Please tell us what went wrong: {feedback_form_link}. We'll make it right.",
  },
  {
    event: "Profile Completion",
    withDeal:
      "Hi {first_name}, complete your {brand_name} profile and unlock {deal_name}. Code: {coupon_code}. Valid for {validity} days. Tap: {form_link}. Reply STOP to opt out.",
    withoutDeal: "Hi {first_name}, help us know you better! Complete your {brand_name} profile: {form_link}. Reply STOP to opt out.",
  },
  {
    event: "Birthday",
    withDeal: "Happy Birthday {first_name}! Celebrate with {brand_name} - use code {coupon_code} for {deal_name}. Valid for {validity} days.",
    withoutDeal: "Happy Birthday {first_name}! Wishing you a wonderful day from {brand_name}. Hope to see you soon!",
  },
];

const UTILITY_WHATSAPP: { event: string; text: string }[] = [
  {
    event: "Low balance",
    text: "⚠️ Your DotPe wallet balance is low. Automations, loyalty messages and campaigns will pause soon. Recharge now to avoid disruption.\nButton: Recharge Now → https://merchant.dotpe.in/marketing/dashboard",
  },
  {
    event: "No balance",
    text: "🚨 Your DotPe wallet balance is exhausted. Automations, loyalty messages and campaigns are currently paused. Recharge now to resume.\n\nButton: Recharge Now → https://merchant.dotpe.in/marketing/dashboard",
  },
];

const LOYALTY_WHATSAPP: { event: string; text: string }[] = [
  {
    event: "Milestone unlocked",
    text: "Hi {{customername}}, 👋\nYou've unlocked {{reward_label}}! You can now redeem it for {{milestone_points_for that reward}} {Point alias}. For more details: {{Customer page}}. Keep earning to unlock more!",
  },
  {
    event: "Point redeemed",
    text: "Hi {{customername}}, 👋\nYou redeemed {{reward_label}} using {{milestone_points_for that reward}} {Point alias}. Remaining balance: {{balance}} {points alias}. Thank you for being a loyal customer!",
  },
];

const LOYALTY_SMS: { event: string; text: string }[] = [
  { event: "OTP Enrol", text: "Your enrolment OTP is {#numeric#} for {#alphanumeric#}'s point based loyalty program. Thanks!" },
  {
    event: "Enrol Confirmed",
    text: "Welcome to {#alphanumeric#}'s point based loyalty program! Earn {#numeric#} {#alphanumeric#} for every ₹100 spent. Redeem them on your next visit!",
  },
  {
    event: "Points Earned",
    text: "Yay! You earned <Points Earned> <points alias> at <Brand Name>! Point balance: <Total Balance> (₹<Balance in INR>). Thank you visiting us.",
  },
  {
    event: "Points Redeemed",
    text: "You redeemed <Points Redeemed> points at <Brand Name> and saved ₹<Redemption Value>. Remaining balance: <Remaining Balance> <points alias>. Thank you!",
  },
  { event: "Point Expiry", text: "URGENT reminder: Your <Balance> points at <Brand Name> are expiring soon. Visit us now to redeem them!" },
  { event: "Opt Out", text: "You have opted out of <Brand Name>'s <Loyalty Program Name>. Visit us to re-enrol anytime!" },
  {
    event: "Bonus Point Earned",
    text: "Congratulations! You have received <x> bonus points as a part of the <program name>. See you soon!",
  },
];

function buildRows(): Row[] {
  const rows: Row[] = [];

  for (const t of AUTOMATION_SMS) {
    rows.push({ channel: "SMS", dealType: "WithDeal", category: "Automation", messageText: t.withDeal });
    if (t.withoutDeal) {
      rows.push({ channel: "SMS", dealType: "WithoutDeal", category: "Automation", messageText: t.withoutDeal });
    }
  }

  for (const t of UTILITY_WHATSAPP) {
    rows.push({ channel: "WhatsApp", dealType: "WithoutDeal", category: "Utility", handle: "RistaByDotpe", messageText: t.text });
  }

  for (const t of LOYALTY_WHATSAPP) {
    rows.push({ channel: "WhatsApp", dealType: "WithoutDeal", category: "Loyalty", messageText: t.text });
  }

  for (const t of LOYALTY_SMS) {
    rows.push({ channel: "SMS", dealType: "WithoutDeal", category: "Loyalty", messageText: t.text });
  }

  return rows;
}

async function main() {
  const existing = await prisma.template.count();
  if (existing > 0) {
    console.log(`Template table already has ${existing} rows — skipping import to avoid duplicating/clobbering CRUD-created data.`);
    console.log("Delete existing rows first if you intend to re-run this import.");
    return;
  }

  const rows = buildRows();
  const result = await prisma.template.createMany({ data: rows });
  console.log(`Inserted ${result.count} templates.`);
  console.log(`  Automation/SMS: ${rows.filter((r) => r.category === "Automation").length}`);
  console.log(`  Utility/WhatsApp: ${rows.filter((r) => r.category === "Utility").length}`);
  console.log(`  Loyalty/WhatsApp: ${rows.filter((r) => r.category === "Loyalty" && r.channel === "WhatsApp").length}`);
  console.log(`  Loyalty/SMS: ${rows.filter((r) => r.category === "Loyalty" && r.channel === "SMS").length}`);
  console.log('Skipped: 3 "Point Loyalty" rows in the sheet (rows 22/23/25 of "Loyalty and others") — entirely empty, no event name or message text.');
  console.log('Skipped: 4 "without deal" automation variants whose sheet cell was the literal placeholder "NA" (Coupon Expiry, Win-Back With Loyalty (Point), Win-Back With Loyalty (Visit), Feedback - Positive).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
