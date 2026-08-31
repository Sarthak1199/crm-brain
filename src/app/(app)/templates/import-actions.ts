"use server";

import ExcelJS from "exceljs";
import { Readable } from "stream";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-mutate";
import type { TemplateCategory } from "@prisma/client";

/** Trimmed, lowercased-header row lookup — same convention as gsheets.ts's pick(). */
function pick(row: Record<string, string>, ...aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const value = row[alias.toLowerCase()];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

/**
 * Reads an uploaded .csv or .xlsx file into header-keyed rows. exceljs
 * handles both formats natively (its csv reader is built on fast-csv), so
 * one library covers the whole "CSV/Excel upload" requirement without a
 * second dependency — chosen over the more common `xlsx`/SheetJS package,
 * which has an unpatched high-severity ReDoS + prototype-pollution
 * advisory with no fix available.
 */
async function parseTemplateFile(buffer: Buffer, filename: string): Promise<Record<string, string>[]> {
  const isCsv = filename.toLowerCase().endsWith(".csv");

  let worksheet: ExcelJS.Worksheet | undefined;
  if (isCsv) {
    const workbook = new ExcelJS.Workbook();
    worksheet = await workbook.csv.read(Readable.from(buffer));
  } else {
    const workbook = new ExcelJS.Workbook();
    // exceljs's own Buffer type comes from a different @types/node version
    // than this project's — a real Node Buffer at runtime either way.
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    worksheet = workbook.worksheets[0];
  }
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim().toLowerCase();
  });

  const rows: Record<string, string>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cell.value;
      obj[header] = value === null || value === undefined ? "" : String(typeof value === "object" && "text" in value ? value.text : value).trim();
    });
    if (Object.values(obj).some((v) => v !== "")) rows.push(obj);
  });

  return rows;
}

// The upload's own Category column doesn't always match TemplateCategory
// (Loyalty/Automation/Campaign/Utility) directly — e.g. the source list
// uses "Point"/"Visit" for two different loyalty mechanics, both of which
// belong under "Loyalty" here; the finer distinction stays in the
// template's own name (points_earned vs. stamp_earned, etc.) rather than
// needing a 6th category value.
function mapCategory(raw: string | undefined): TemplateCategory | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "loyalty" || s === "point" || s === "visit") return "Loyalty";
  if (s === "automation") return "Automation";
  if (s === "campaign") return "Campaign";
  if (s === "utility") return "Utility";
  return null;
}

// Deal type isn't a column in the source list — derived from the naming
// convention already used throughout it (e.g. "..._with_deal" /
// "..._without_deal"); rows with neither suffix (the Point/Visit rows,
// which aren't deal-oriented messages at all) default to WithoutDeal.
function mapDealType(name: string, explicit: string | undefined): "WithDeal" | "WithoutDeal" {
  const e = (explicit ?? "").trim().toLowerCase();
  if (e === "withdeal" || e === "with deal") return "WithDeal";
  if (e === "withoutdeal" || e === "without deal") return "WithoutDeal";
  const n = name.toLowerCase();
  if (n.includes("without_deal") || n.includes("withou_deal")) return "WithoutDeal";
  if (n.includes("with_deal")) return "WithDeal";
  return "WithoutDeal";
}

export type TemplateImportResult = {
  created: number;
  updated: number;
  skipped: { row: number; reason: string }[];
  duplicateEventIds: string[];
};

export async function importTemplates(formData: FormData): Promise<TemplateImportResult | { error: string }> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV or Excel file to upload." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, string>[];
  try {
    rows = await parseTemplateFile(buffer, file.name);
  } catch (error) {
    return { error: `Could not read that file: ${error instanceof Error ? error.message : "unknown error"}` };
  }
  if (rows.length === 0) {
    return { error: "No rows found in that file." };
  }

  const eventIdCounts = new Map<string, number>();
  for (const row of rows) {
    const eventId = pick(row, "event id", "event_id", "eventid");
    if (eventId) eventIdCounts.set(eventId, (eventIdCounts.get(eventId) ?? 0) + 1);
  }
  const duplicateEventIds = Array.from(eventIdCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  let created = 0;
  let updated = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // account for the header row

    const name = pick(row, "template name", "name")?.trim();
    const eventId = pick(row, "event id", "event_id", "eventid")?.trim();
    const messageText = pick(row, "template text", "message text", "messagetext")?.trim();

    if (!name) {
      skipped.push({ row: rowNumber, reason: "Missing Template Name" });
      continue;
    }
    if (!eventId) {
      skipped.push({ row: rowNumber, reason: "Missing Event ID" });
      continue;
    }
    if (!messageText) {
      skipped.push({ row: rowNumber, reason: "Missing Template Text" });
      continue;
    }

    const category = mapCategory(pick(row, "category"));
    const channel = pick(row, "channel")?.trim().toLowerCase() === "sms" ? "SMS" : "WhatsApp";
    const dealType = mapDealType(name, pick(row, "deal type", "dealtype"));

    const data = { name, eventId, messageText, category, channel, dealType } as const;

    try {
      const existing = await prisma.template.findFirst({ where: { name } });
      if (existing) {
        await prisma.template.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.template.create({ data });
        created++;
      }
    } catch (error) {
      skipped.push({ row: rowNumber, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  revalidatePath("/templates");
  return { created, updated, skipped, duplicateEventIds };
}
