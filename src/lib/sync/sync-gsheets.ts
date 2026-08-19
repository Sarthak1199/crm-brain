import { prisma } from "@/lib/prisma";
import { pick, readSheetAsObjects, resolveSheetTitleByGid } from "@/lib/gsheets";
import { normalizeMid } from "./mid";
import { withSyncRun, runStep } from "./sync-run";
import { GSHEET_SOURCES } from "./gsheet-sources";
import { syncLoyaltyOnboarding } from "./sync-onboarding";

export { GSHEET_SOURCES, gsheetUrl } from "./gsheet-sources";

function parseAmount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseInt_(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function parseYesNo(value: string | undefined): "Active" | "Inactive" | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase() === "yes" ? "Active" : "Inactive";
}

/**
 * "CRM active" tab — MID, POC contact, and pre/post CRM credit snapshot.
 * Update-only: matches existing merchants by MID (this is the primary key
 * across every sync source, GSheets included).
 */
export async function syncCrmActiveSheet() {
  const source = GSHEET_SOURCES.crmActive;
  const title = await resolveSheetTitleByGid(source.spreadsheetId, source.gid);
  const rows = await readSheetAsObjects(source.spreadsheetId, title, source.headerRow);

  let matched = 0;
  let skipped = 0;

  for (const row of rows) {
    const dotpeMid = normalizeMid(pick(row, "merchant_id"));
    if (!dotpeMid) {
      skipped++;
      continue;
    }

    const pocName = pick(row, "poc name");
    const pocNumber = pick(row, "phone number");
    const preCrmCredits = parseAmount(pick(row, "before crm"));
    const postCrmCredits = parseAmount(pick(row, "after crm"));

    try {
      const result = await prisma.merchant.updateMany({
        where: { dotpeMid },
        data: {
          ...(pocName ? { pocName } : {}),
          ...(pocNumber ? { pocNumber } : {}),
          ...(preCrmCredits !== undefined ? { preCrmCredits } : {}),
          ...(postCrmCredits !== undefined ? { postCrmCredits } : {}),
        },
      });
      matched += result.count;
    } catch (error) {
      console.error(`syncCrmActiveSheet: skipped MID ${dotpeMid}`, error);
    }
  }

  return { matched, skipped };
}

/**
 * "CRM+Loyalty closures" tab — brand identity, payment collected, outlet
 * counts, and the *authoritative* yearly potential figure (ops-maintained,
 * takes priority over the activeDineInStores × 10000 formula). "Payment
 * collected" also doubles as subscriptionRevenue — same underlying figure.
 */
export async function syncCrmLoyaltyClosuresSheet() {
  const source = GSHEET_SOURCES.crmLoyaltyClosures;
  const title = await resolveSheetTitleByGid(source.spreadsheetId, source.gid);
  const rows = await readSheetAsObjects(source.spreadsheetId, title, source.headerRow);

  let matched = 0;
  let created = 0;
  let skipped = 0;

  // The sheet sometimes has the same MID on more than one row (distinct
  // closure entries, occasionally even under different brand names — a
  // sheet data-entry issue, not something we can resolve by picking one).
  // Grouping first and summing payment across the group's rows means a
  // second row for the same MID adds to the total instead of overwriting
  // it and silently losing the first row's amount.
  type Group = {
    ristaBrandId?: string;
    brandName?: string;
    paymentSum: number;
    hasPayment: boolean;
    totalStores?: number;
    paidBranches?: number;
    closedBranches?: number;
    totalYearlyPotential?: number;
    loyaltyStatus?: "Active" | "Inactive";
    crmActivationConfirmed: boolean;
  };
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const dotpeMid = normalizeMid(pick(row, "mid"));
    const brandName = pick(row, "brand name");
    if (!dotpeMid) {
      skipped++;
      continue;
    }

    const ristaBrandId = pick(row, "rista acc number");
    const paymentCollected = parseAmount(pick(row, "payment collected"));
    const totalStores = parseInt_(pick(row, "total no. of outlets"));
    const paidBranches = parseInt_(pick(row, "pending outlet closure"));
    const closedBranches = parseInt_(pick(row, "outlet closed"));
    const totalYearlyPotential = parseAmount(pick(row, "total potential closure yearly"));
    const loyaltyStatus = parseYesNo(pick(row, "loyalty activation status"));
    // Explicit boolean, not optional: absence/"No" in this sheet must be able
    // to revoke a previously-confirmed Paid count, not just leave it alone.
    const crmActivationConfirmed = (pick(row, "crm activation status") ?? "").trim().toLowerCase() === "yes";

    const existingGroup = groups.get(dotpeMid);
    groups.set(dotpeMid, {
      ristaBrandId: ristaBrandId ?? existingGroup?.ristaBrandId,
      brandName: brandName ?? existingGroup?.brandName,
      paymentSum: (existingGroup?.paymentSum ?? 0) + (paymentCollected ?? 0),
      hasPayment: (existingGroup?.hasPayment ?? false) || paymentCollected !== undefined,
      totalStores: totalStores ?? existingGroup?.totalStores,
      paidBranches: paidBranches ?? existingGroup?.paidBranches,
      closedBranches: closedBranches ?? existingGroup?.closedBranches,
      totalYearlyPotential: totalYearlyPotential ?? existingGroup?.totalYearlyPotential,
      loyaltyStatus: loyaltyStatus ?? existingGroup?.loyaltyStatus,
      // A later row's explicit confirmation should win, but don't let a
      // blank/"No" later row silently revoke an earlier row's "Yes".
      crmActivationConfirmed: crmActivationConfirmed || (existingGroup?.crmActivationConfirmed ?? false),
    });
  }

  for (const [dotpeMid, g] of groups) {
    const updateData = {
      ...(g.ristaBrandId ? { ristaBrandId: g.ristaBrandId } : {}),
      ...(g.brandName ? { brandName: g.brandName } : {}),
      ...(g.hasPayment ? { paymentCollected: g.paymentSum, subscriptionRevenue: g.paymentSum } : {}),
      ...(g.totalStores !== undefined ? { totalStores: g.totalStores } : {}),
      ...(g.paidBranches !== undefined ? { paidBranches: g.paidBranches } : {}),
      ...(g.closedBranches !== undefined ? { closedBranches: g.closedBranches } : {}),
      ...(g.totalYearlyPotential !== undefined ? { totalYearlyPotential: g.totalYearlyPotential } : {}),
      ...(g.loyaltyStatus ? { loyaltyStatus: g.loyaltyStatus } : {}),
      crmActivationConfirmed: g.crmActivationConfirmed,
    };

    try {
      const existing = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });
      if (existing) {
        await prisma.merchant.update({ where: { dotpeMid }, data: updateData });
        matched++;
      } else if (g.brandName) {
        // This sheet is sometimes the FIRST place a new closure shows up,
        // ahead of the next Redash sync — create rather than silently drop
        // the row so its payment/branch figures aren't lost.
        await prisma.merchant.create({ data: { dotpeMid, brandName: g.brandName, ...updateData } });
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`syncCrmLoyaltyClosuresSheet: skipped MID ${dotpeMid}`, error);
      skipped++;
    }
  }

  return { matched, created, skipped };
}

/**
 * "CRM GTM / Demo" tab — outlet integration breakdown. Some rows roll up
 * multiple merchant IDs into one brand row (Dotpe_Merchant_IDs joined with
 * " || "); to avoid double-counting a shared total across several merchant
 * records, only the first ID in each row is updated.
 */
export async function syncCrmGtmDemoSheet() {
  const source = GSHEET_SOURCES.crmGtmDemo;
  const title = await resolveSheetTitleByGid(source.spreadsheetId, source.gid);
  const rows = await readSheetAsObjects(source.spreadsheetId, title, source.headerRow);

  let matched = 0;
  let skipped = 0;

  for (const row of rows) {
    const idsRaw = pick(row, "dotpe_merchant_ids");
    const ids = (idsRaw ?? "").split("||").map(normalizeMid).filter(Boolean);
    const dotpeMid = ids[0];
    if (!dotpeMid) {
      skipped++;
      continue;
    }

    const totalStores = parseInt_(pick(row, "total_outlets_integrated_counted_once"));
    const dotpeOnly = parseInt_(pick(row, "outlets_dotpe_store_only")) ?? 0;
    const ristaWithDotpe = parseInt_(pick(row, "outlets_rista_branch_with_dotpe_store")) ?? 0;

    try {
      const result = await prisma.merchant.updateMany({
        where: { dotpeMid },
        data: {
          ...(totalStores !== undefined ? { totalStores } : {}),
          dotpeBranches: dotpeOnly + ristaWithDotpe,
        },
      });
      matched += result.count;
    } catch (error) {
      console.error(`syncCrmGtmDemoSheet: skipped MID ${dotpeMid}`, error);
    }
  }

  return { matched, skipped };
}

/**
 * "CRM [Product] / Roadmap" tab — full replace on every sync (not a
 * per-merchant table, no stable natural key across syncs to upsert against;
 * the sheet itself is the source of truth for the whole list).
 */
export async function syncRoadmap() {
  const source = GSHEET_SOURCES.roadmap;
  const title = await resolveSheetTitleByGid(source.spreadsheetId, source.gid);
  const rows = await readSheetAsObjects(source.spreadsheetId, title, source.headerRow);

  const items = rows
    .map((row) => ({
      theme: pick(row, "theme") ?? null,
      title: pick(row, "title"),
      ticketUrl: pick(row, "tickets") ?? null,
      design: pick(row, "design") ?? null,
      rista: pick(row, "rista") ?? null,
      priority: pick(row, "priority") ?? null,
      usp: !!pick(row, "usp"),
      status: pick(row, "status") ?? "",
      goLiveDate: pick(row, "go live") ?? null,
      manpowerWeeks: parseAmount(pick(row, "manpower weeks")) ?? null,
      description: pick(row, "description") ?? null,
      brandSignal: pick(row, "brand signal") ?? null,
      why: pick(row, "why") ?? null,
    }))
    .filter((item): item is typeof item & { title: string } => !!item.title);

  await prisma.$transaction([
    prisma.roadmapItem.deleteMany({}),
    ...(items.length > 0 ? [prisma.roadmapItem.createMany({ data: items })] : []),
  ]);

  return { count: items.length };
}

export async function syncGsheets() {
  return withSyncRun("GSHEETS", async () => ({
    crmActive: await runStep("crmActive", syncCrmActiveSheet),
    crmLoyaltyClosures: await runStep("crmLoyaltyClosures", syncCrmLoyaltyClosuresSheet),
    crmGtmDemo: await runStep("crmGtmDemo", syncCrmGtmDemoSheet),
    roadmap: await runStep("roadmap", syncRoadmap),
    loyaltyOnboarding: await runStep("loyaltyOnboarding", syncLoyaltyOnboarding),
  }));
}
