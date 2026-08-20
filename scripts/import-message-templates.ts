// One-off import of the "Message templates" Google Sheet into the Template
// table. Not part of the daily cron sync — templates are an app-native CRUD
// entity going forward (see /templates), this just seeds the initial set.
//
// Source: https://docs.google.com/spreadsheets/d/1DkljE_csKY0w4R7WkNErac4WUR5wRSlCR304HDG2Tus
//   - "automation_templates.csv" tab: priority, #, event, channel,
//     "template with deal", "template without deal" — each row splits into
//     up to 2 Template rows (one per deal-type variant).
//   - "Loyalty and others" tab: priority, category, event, channel,
//     template, comments — single message per row; category values here are
//     inconsistent (row numbers, "Mx number input", etc.) so category is
//     left null for both tabs, same as automation_templates.csv. dealType is
//     inferred from whether the message text references a coupon/deal code.
//   - "Approved ✅" tab intentionally skipped: it's a global list of 27
//     provider template IDs with no merchant linkage, so it can't seed the
//     per-merchant TemplateApproval table as the feature's spec requires.
//
// Run once per environment:
//   npx tsx -r dotenv/config scripts/import-message-templates.ts
//   DATABASE_URL=... DIRECT_URL=... npx tsx -r dotenv/config scripts/import-message-templates.ts

import { PrismaClient, TemplateChannel, TemplateDealType } from "@prisma/client";
import { resolveSheetTitleByGid, readSheetAsObjects } from "../src/lib/gsheets";

const prisma = new PrismaClient();

const SPREADSHEET_ID = "1DkljE_csKY0w4R7WkNErac4WUR5wRSlCR304HDG2Tus";
const AUTOMATION_TAB_GID = 1776295693;

function normalizeChannel(raw: string): TemplateChannel | null {
  const v = raw.trim().toLowerCase();
  if (v === "whatsapp") return TemplateChannel.WhatsApp;
  if (v === "sms") return TemplateChannel.SMS;
  return null;
}

const DEAL_HINT = /\{coupon_code\}|\bcoupon\b|\bdeal\b|\bcode:/i;
function inferDealType(text: string): TemplateDealType {
  return DEAL_HINT.test(text) ? TemplateDealType.WithDeal : TemplateDealType.WithoutDeal;
}

type TemplateRow = { channel: TemplateChannel; dealType: TemplateDealType; messageText: string };

async function collectFromAutomationTab(): Promise<TemplateRow[]> {
  const title = await resolveSheetTitleByGid(SPREADSHEET_ID, AUTOMATION_TAB_GID);
  const rows = await readSheetAsObjects(SPREADSHEET_ID, title);

  const out: TemplateRow[] = [];
  for (const row of rows) {
    const channel = normalizeChannel(row["channel"] ?? "");
    if (!channel) continue;

    const withDeal = row["template with deal"]?.trim();
    if (withDeal) out.push({ channel, dealType: TemplateDealType.WithDeal, messageText: withDeal });

    const withoutDeal = row["template without deal"]?.trim();
    if (withoutDeal) out.push({ channel, dealType: TemplateDealType.WithoutDeal, messageText: withoutDeal });
  }
  return out;
}

async function collectFromLoyaltyTab(): Promise<TemplateRow[]> {
  const rows = await readSheetAsObjects(SPREADSHEET_ID, "Loyalty and others");

  const out: TemplateRow[] = [];
  for (const row of rows) {
    const channel = normalizeChannel(row["channel"] ?? "");
    const messageText = row["template"]?.trim();
    if (!channel || !messageText) continue;
    out.push({ channel, dealType: inferDealType(messageText), messageText });
  }
  return out;
}

async function main() {
  const existing = await prisma.template.count();
  if (existing > 0) {
    console.log(`Template table already has ${existing} rows — skipping import to avoid duplicating/clobbering CRUD-created data.`);
    console.log("Delete existing rows first if you intend to re-run this import.");
    return;
  }

  console.log("Reading automation_templates.csv tab...");
  const automationRows = await collectFromAutomationTab();
  console.log(`  -> ${automationRows.length} template rows`);

  console.log("Reading Loyalty and others tab...");
  const loyaltyRows = await collectFromLoyaltyTab();
  console.log(`  -> ${loyaltyRows.length} template rows`);

  const all = [...automationRows, ...loyaltyRows];
  const result = await prisma.template.createMany({ data: all });
  console.log(`Inserted ${result.count} templates (category left null for manual tagging).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
