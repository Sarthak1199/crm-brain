import { prisma } from "@/lib/prisma";
import { pick, readSheetAsObjects, resolveSheetTitleByGid } from "@/lib/gsheets";
import { normalizeMid } from "./mid";
import { GSHEET_SOURCES } from "./gsheet-sources";

function isYes(value: string | undefined) {
  return (value ?? "").trim().toLowerCase() === "yes";
}

// Both timestamp columns in this sheet are IST wall-clock time (Google Forms
// respects the spreadsheet's locale, which is IST here) — always convert
// explicitly rather than via the host machine's local timezone, which won't
// reliably be IST outside local dev.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** "19/05/2026 17:32:32" — the raw Form timestamp format. */
function parseFormTimestamp(raw: string | undefined): Date | null {
  const m = raw?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  const utcMs =
    Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss)) - IST_OFFSET_MS;
  return new Date(utcMs);
}

/** "2026-06-04 14:23:52 IST" — the BE's write-back timestamp format. */
function parseEnabledAt(raw: string | undefined): Date | null {
  const m = raw?.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, yyyy, mm, dd, hh, min, ss] = m;
  const utcMs =
    Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss)) - IST_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Mirrors "Dotpe CRM [Activation] > Loyalty enable" in full, keyed by sheet
 * row index (stable — the sheet is append-only). Picks up both rows this
 * app submitted and any submitted directly via the original Google Form,
 * plus the BE's write-back columns (Is Enabled / Enabled At / CRM is
 * Enabled / CRM enabled At) as they get filled in over time.
 */
export async function syncLoyaltyOnboarding() {
  const source = GSHEET_SOURCES.loyaltyOnboarding;
  const title = await resolveSheetTitleByGid(source.spreadsheetId, source.gid);
  const rows = await readSheetAsObjects(source.spreadsheetId, title, source.headerRow);

  let synced = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sheetRowIndex = i + source.headerRow + 1;

    const enterpriseMerchantId = pick(row, "merchantid (enterprise):");
    const normalizedMid = enterpriseMerchantId ? normalizeMid(enterpriseMerchantId) : null;

    // A fully blank row (e.g. trailing sheet padding) has no timestamp and nothing else useful.
    const timestamp = parseFormTimestamp(pick(row, "timestamp"));
    if (!timestamp && !enterpriseMerchantId) {
      skipped++;
      continue;
    }

    try {
      let merchantId: string | null = null;
      if (normalizedMid) {
        const merchant = await prisma.merchant.findUnique({
          where: { dotpeMid: normalizedMid },
          select: { id: true },
        });
        merchantId = merchant?.id ?? null;
      }

      await prisma.onboardingRequest.upsert({
        where: { sheetRowIndex },
        create: {
          sheetRowIndex,
          timestamp,
          email: pick(row, "email address") ?? null,
          businessName: pick(row, "business name") ?? null,
          merchantId,
          enterpriseMerchantId: enterpriseMerchantId ?? null,
          ristaBusinessId: pick(row, "businessid (rista):") ?? null,
          ristaBrandId: pick(row, "brandid (rista):") ?? null,
          ristaBranchId: pick(row, "branchid (rista):") ?? null,
          branchCode: pick(row, "branchcode:") ?? null,
          storeCode: pick(row, "storecode:") ?? null,
          enterpriseStoreId: pick(row, "storeid (enterprise):") ?? null,
          loyaltyType: pick(row, "loyalty type") ?? null,
          automation: isYes(pick(row, "automation?")),
          dotpeUsername: pick(row, "dotpe username") ?? null,
          crmLicenseRequested: isYes(pick(row, "crm license enable?")),
          loyaltyEnabled: isYes(pick(row, "is enabled (do not fill)")),
          loyaltyEnabledAt: parseEnabledAt(pick(row, "enabled at (do not fill)")),
          crmEnabled: isYes(pick(row, "crm is enabled (do not fill)")),
          crmEnabledAt: parseEnabledAt(pick(row, "crm enabled at (do not fill)")),
          additionalComment: pick(row, "additional comment") ?? null,
          remarks: pick(row, "remarks") ?? null,
        },
        update: {
          timestamp,
          email: pick(row, "email address") ?? null,
          businessName: pick(row, "business name") ?? null,
          merchantId,
          enterpriseMerchantId: enterpriseMerchantId ?? null,
          ristaBusinessId: pick(row, "businessid (rista):") ?? null,
          ristaBrandId: pick(row, "brandid (rista):") ?? null,
          ristaBranchId: pick(row, "branchid (rista):") ?? null,
          branchCode: pick(row, "branchcode:") ?? null,
          storeCode: pick(row, "storecode:") ?? null,
          enterpriseStoreId: pick(row, "storeid (enterprise):") ?? null,
          loyaltyType: pick(row, "loyalty type") ?? null,
          automation: isYes(pick(row, "automation?")),
          dotpeUsername: pick(row, "dotpe username") ?? null,
          crmLicenseRequested: isYes(pick(row, "crm license enable?")),
          loyaltyEnabled: isYes(pick(row, "is enabled (do not fill)")),
          loyaltyEnabledAt: parseEnabledAt(pick(row, "enabled at (do not fill)")),
          crmEnabled: isYes(pick(row, "crm is enabled (do not fill)")),
          crmEnabledAt: parseEnabledAt(pick(row, "crm enabled at (do not fill)")),
          additionalComment: pick(row, "additional comment") ?? null,
          remarks: pick(row, "remarks") ?? null,
        },
      });
      synced++;
    } catch (error) {
      console.error(`syncLoyaltyOnboarding: skipped row ${sheetRowIndex}`, error);
    }
  }

  return { synced, skipped };
}
