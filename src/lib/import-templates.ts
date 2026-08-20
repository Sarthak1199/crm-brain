// Full bulk import of the "Message templates" Google Sheet, shared by the
// local dev script (scripts/import-message-templates.ts) and the one-time
// production admin route, so both run identically.
//
// Source: https://docs.google.com/spreadsheets/d/1DkljE_csKY0w4R7WkNErac4WUR5wRSlCR304HDG2Tus
//
// Every row with real message text, on both tabs, becomes a Template row —
// "with deal" / "without deal" columns each produce their own row when
// non-empty and not the literal placeholder "NA" (that's an explicit "not
// applicable" marker, not content to import). Approval Status = Approved
// for every row (this is a one-time bulk upload of already-approved copy).
//
// The "Loyalty and others" tab largely re-lists the same events as
// automation_templates.csv for SMS, with the tab's own "#" column bleeding
// into a "category" field there (bare numbers like "3", "12") rather than a
// real category — those rows are skipped ONLY when their (channel, exact
// message text) already came from automation_templates.csv, so no template
// is dropped, but we also don't create literal duplicate rows. Two rows
// that look like duplicates by event name but aren't — the SMS versions of
// "WA balance low" / "WA balance is 0" — have no automation-tab SMS
// counterpart (that tab only has the WhatsApp copy) and are kept.
//
// Category is imported verbatim from the sheet, with one deliberate
// override: "OTP enrol" is tagged "Loyalty" in the sheet, but per the
// existing OTP+Utility category merge (this app has no separate OTP
// category), it's recategorized to "Utility" here.
//
// Handle = "Rista by DotPe" only for the SMS OTP template and the
// WhatsApp low/zero-balance templates (across both tabs' own naming for
// that event — "WA balance low"/"WA balance is 0" in automation_templates,
// "Low balance"/"No balance" in Loyalty and others). Everything else is
// "Merchant".

import { PrismaClient, TemplateChannel, TemplateDealType, TemplateCategory, TemplateHandle } from "@prisma/client";
import { readSheetAsObjects } from "./gsheets";

const SPREADSHEET_ID = "1DkljE_csKY0w4R7WkNErac4WUR5wRSlCR304HDG2Tus";

const RISTA_SMS_EVENTS = new Set(["OTP enrol"]);
const RISTA_WHATSAPP_EVENTS = new Set(["WA balance low", "WA balance is 0", "Low balance", "No balance"]);

type Row = {
  channel: TemplateChannel;
  dealType: TemplateDealType;
  category: TemplateCategory | null;
  handle: TemplateHandle;
  messageText: string;
};

function normalizeChannel(raw: string): TemplateChannel | null {
  const v = raw.trim().toLowerCase();
  if (v === "whatsapp") return TemplateChannel.WhatsApp;
  if (v === "sms") return TemplateChannel.SMS;
  return null;
}

function normalizeCategory(raw: string, event: string): TemplateCategory | null {
  if (event === "OTP enrol") return TemplateCategory.Utility;
  const v = raw.trim();
  if (v === "Automation" || v === "Loyalty" || v === "Campaign" || v === "Utility") return v as TemplateCategory;
  return null; // blank, or a stray row-number left over from the tab's "#" column
}

function resolveHandle(channel: TemplateChannel, event: string): TemplateHandle {
  if (channel === "SMS" && RISTA_SMS_EVENTS.has(event)) return TemplateHandle.RistaByDotpe;
  if (channel === "WhatsApp" && RISTA_WHATSAPP_EVENTS.has(event)) return TemplateHandle.RistaByDotpe;
  return TemplateHandle.Merchant;
}

async function collectFromAutomationTab(): Promise<Row[]> {
  const rows = await readSheetAsObjects(SPREADSHEET_ID, "automation_templates.csv", 1);
  const out: Row[] = [];
  for (const row of rows) {
    const channel = normalizeChannel(row["channel"] ?? "");
    const event = row["event"]?.trim();
    if (!channel || !event) continue;
    const category = normalizeCategory(row["category"] ?? "", event);
    const handle = resolveHandle(channel, event);
    const withDeal = row["template with deal"]?.trim();
    if (withDeal && withDeal.toUpperCase() !== "NA") {
      out.push({ channel, dealType: TemplateDealType.WithDeal, category, handle, messageText: withDeal });
    }
    const withoutDeal = row["template without deal"]?.trim();
    if (withoutDeal && withoutDeal.toUpperCase() !== "NA") {
      out.push({ channel, dealType: TemplateDealType.WithoutDeal, category, handle, messageText: withoutDeal });
    }
  }
  return out;
}

async function collectFromLoyaltyTab(existingTexts: Set<string>): Promise<Row[]> {
  const rows = await readSheetAsObjects(SPREADSHEET_ID, "Loyalty and others", 1);
  const out: Row[] = [];
  for (const row of rows) {
    const channel = normalizeChannel(row["channel"] ?? "");
    const event = row["event"]?.trim();
    const messageText = row["template"]?.trim();
    if (!channel || !event || !messageText) continue;
    if (existingTexts.has(`${channel}||${messageText}`)) continue; // exact duplicate of an automation-tab row
    const category = normalizeCategory(row["category"] ?? "", event);
    const handle = resolveHandle(channel, event);
    out.push({ channel, dealType: TemplateDealType.WithoutDeal, category, handle, messageText });
  }
  return out;
}

export async function importMessageTemplates(prisma: PrismaClient) {
  const existing = await prisma.template.count();
  if (existing > 0) {
    await prisma.templateApproval.deleteMany({});
    await prisma.template.deleteMany({});
  }

  const automationRows = await collectFromAutomationTab();
  const existingTexts = new Set(automationRows.map((r) => `${r.channel}||${r.messageText}`));
  const loyaltyRows = await collectFromLoyaltyTab(existingTexts);
  const all = [...automationRows, ...loyaltyRows];

  let inserted = 0;
  let ristaHandleCount = 0;
  for (const row of all) {
    const template = await prisma.template.create({ data: row });
    await prisma.templateApproval.create({ data: { templateId: template.id, approvalStatus: "Approved" } });
    inserted++;
    if (row.handle === "RistaByDotpe") ristaHandleCount++;
  }

  return {
    clearedExisting: existing,
    automationTabCount: automationRows.length,
    loyaltyTabCount: loyaltyRows.length,
    inserted,
    ristaHandleCount,
    merchantHandleCount: inserted - ristaHandleCount,
  };
}
