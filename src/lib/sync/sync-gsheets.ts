import { prisma } from "@/lib/prisma";
import { pick, readSheetAsObjects, resolveSheetTitleByGid } from "@/lib/gsheets";
import { isPendingMid, normalizeMid, pendingMid } from "./mid";
import { withSyncRun, runStep } from "./sync-run";
import { mapWithConcurrency } from "./concurrency";
import { GSHEET_SOURCES } from "./gsheet-sources";
import { syncLoyaltyOnboarding } from "./sync-onboarding";
import { mapRoadmapLifecycleStatus } from "@/lib/roadmap-status";

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

  // Same fix as syncCrmGtmDemoSheet below: independent per-merchant writes
  // run with bounded concurrency instead of one at a time — with the sheet
  // grown to its current row count, the old sequential version was slow
  // enough to be a real contributor to syncGsheets() as a whole timing out
  // and never finishing (see syncCrmLoyaltyClosuresSheet for the other half
  // of that same bug, and its effect on stale "Total Collected" figures).
  const outcomes = await mapWithConcurrency(rows, 15, async (row) => {
    const dotpeMid = normalizeMid(pick(row, "merchant_id"));
    if (!dotpeMid) return { matched: 0, skipped: 1 };

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
      return { matched: result.count, skipped: 0 };
    } catch (error) {
      console.error(`syncCrmActiveSheet: skipped MID ${dotpeMid}`, error);
      return { matched: 0, skipped: 0 };
    }
  });

  let matched = 0;
  let skipped = 0;
  for (const o of outcomes) {
    matched += o.matched;
    skipped += o.skipped;
  }

  return { matched, skipped };
}

// A renamed header would otherwise read as "blank everywhere" and wipe real figures.
const SALES_SHEET_HEADERS = [
  "mid",
  "brand name",
  "payment collected",
  "outlet closed",
  "total no. of outlets",
  "pending outlet closure",
  "per outlet commercials (yearly)",
  "pending potential as per total deal value",
  "crm activation status",
  "loyalty activation status",
];

/**
 * "CRM+Loyalty closures" tab — the sales sheet, and the only source for
 * payment collected, per-outlet commercials, closed/pending branches and
 * pending potential. The app mirrors it: a figure cleared or a row removed
 * there is cleared here on the next sync.
 */
export async function syncCrmLoyaltyClosuresSheet() {
  const source = GSHEET_SOURCES.crmLoyaltyClosures;
  const title = await resolveSheetTitleByGid(source.spreadsheetId, source.gid);
  const rows = await readSheetAsObjects(source.spreadsheetId, title, source.headerRow);

  const headers = new Set(rows.flatMap((row) => Object.keys(row)));
  const missing = SALES_SHEET_HEADERS.filter((h) => !headers.has(h));
  if (missing.length > 0) {
    throw new Error(`Sales sheet columns missing or renamed: ${missing.join(", ")}`);
  }

  let matched = 0;
  let created = 0;
  let skipped = 0;

  // The sheet sometimes has the same MID on more than one row (distinct
  // closure entries, occasionally even under different brand names), so the
  // figures are summed across a MID's rows.
  type Group = {
    accountNumber?: string;
    brandName?: string;
    totalStores?: number;
    paymentCollected: number;
    closedBranches: number;
    pendingBranches: number;
    pendingPotentialClosure: number;
    perOutletCommercials: number;
    loyaltyStatus?: "Active" | "Inactive";
    crmActivationConfirmed: boolean;
  };
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const brandName = pick(row, "brand name");
    const paymentCollected = parseAmount(pick(row, "payment collected")) ?? 0;
    const closedBranches = parseInt_(pick(row, "outlet closed")) ?? 0;

    let dotpeMid = normalizeMid(pick(row, "mid"));
    if (!dotpeMid) {
      // No MID yet: still count a closed deal; ignore blank and pipeline rows.
      if (!brandName || (paymentCollected <= 0 && closedBranches <= 0)) {
        skipped++;
        continue;
      }
      dotpeMid = pendingMid(brandName);
    }

    const g = groups.get(dotpeMid);
    groups.set(dotpeMid, {
      // An account number, not a brand id — several MIDs can share one.
      accountNumber: pick(row, "rista acc number") ?? g?.accountNumber,
      brandName: brandName ?? g?.brandName,
      totalStores: parseInt_(pick(row, "total no. of outlets")) ?? g?.totalStores,
      paymentCollected: (g?.paymentCollected ?? 0) + paymentCollected,
      closedBranches: (g?.closedBranches ?? 0) + closedBranches,
      pendingBranches: (g?.pendingBranches ?? 0) + (parseInt_(pick(row, "pending outlet closure")) ?? 0),
      pendingPotentialClosure:
        (g?.pendingPotentialClosure ?? 0) +
        (parseAmount(pick(row, "pending potential as per total deal value")) ?? 0),
      perOutletCommercials:
        parseAmount(pick(row, "per outlet commercials (yearly)")) ?? g?.perOutletCommercials ?? 0,
      loyaltyStatus: parseYesNo(pick(row, "loyalty activation status")) ?? g?.loyaltyStatus,
      // Tracks CRM system activation, a later event than the sale closing.
      // Any row's "Yes" wins; no "Yes" at all revokes it.
      crmActivationConfirmed:
        (pick(row, "crm activation status") ?? "").trim().toLowerCase() === "yes" ||
        (g?.crmActivationConfirmed ?? false),
    });
  }

  if (![...groups.values()].some((g) => g.paymentCollected > 0)) {
    throw new Error("Sales sheet has no payments at all — refusing to overwrite the app's figures.");
  }

  // Bounded concurrency: one serial round-trip per merchant was slow enough
  // that the sync could die partway and silently under-report revenue.
  const outcomes = await mapWithConcurrency(Array.from(groups), 15, async ([dotpeMid, g]) => {
    const updateData = {
      ...(g.accountNumber ? { accountNumber: g.accountNumber } : {}),
      ...(g.brandName ? { brandName: g.brandName } : {}),
      ...(g.totalStores !== undefined ? { totalStores: g.totalStores } : {}),
      paymentCollected: g.paymentCollected,
      subscriptionRevenue: g.paymentCollected,
      closedBranches: g.closedBranches,
      pendingBranches: g.pendingBranches,
      pendingPotentialClosure: g.pendingPotentialClosure,
      perOutletCommercials: g.perOutletCommercials,
      ...(g.loyaltyStatus ? { loyaltyStatus: g.loyaltyStatus } : {}),
      crmActivationConfirmed: g.crmActivationConfirmed,
    };

    try {
      if (g.brandName && !isPendingMid(dotpeMid)) {
        await adoptPendingMerchant(pendingMid(g.brandName), dotpeMid);
      }
      const existing = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });
      if (existing) {
        await prisma.merchant.update({ where: { dotpeMid }, data: updateData });
        return { matched: 1, created: 0, skipped: 0 };
      } else if (g.brandName) {
        // This sheet is sometimes the FIRST place a new closure shows up,
        // ahead of the next Redash sync — create rather than silently drop
        // the row so its payment/branch figures aren't lost.
        await prisma.merchant.create({ data: { dotpeMid, brandName: g.brandName, ...updateData } });
        return { matched: 0, created: 1, skipped: 0 };
      }
      return { matched: 0, created: 0, skipped: 1 };
    } catch (error) {
      console.error(`syncCrmLoyaltyClosuresSheet: skipped MID ${dotpeMid}`, error);
      return { matched: 0, created: 0, skipped: 1 };
    }
  });

  for (const o of outcomes) {
    matched += o.matched;
    created += o.created;
    skipped += o.skipped;
  }

  const cleared = await clearMerchantsNotInSalesSheet([...groups.keys()]);
  const pendingMidCount = [...groups.keys()].filter(isPendingMid).length;

  return { matched, created, skipped, cleared, pendingMid: pendingMidCount };
}

/** Once the sheet gains a MID, fold the brand's placeholder into the real merchant. */
async function adoptPendingMerchant(placeholderMid: string, dotpeMid: string) {
  const placeholder = await prisma.merchant.findUnique({ where: { dotpeMid: placeholderMid }, select: { id: true } });
  if (!placeholder) return;

  const real = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });
  if (!real) {
    await prisma.merchant.update({ where: { id: placeholder.id }, data: { dotpeMid } });
    return;
  }
  const move = { where: { merchantId: placeholder.id }, data: { merchantId: real.id } };
  await prisma.$transaction([
    prisma.supportRequest.updateMany(move),
    prisma.onboardingRequest.updateMany(move),
    prisma.merchant.delete({ where: { id: placeholder.id } }),
  ]);
}

async function clearMerchantsNotInSalesSheet(sheetMids: string[]) {
  const absent = await prisma.merchant.findMany({
    where: { dotpeMid: { notIn: sheetMids } },
    select: { id: true, dotpeMid: true, brandName: true },
  });

  // A placeholder exists only because of its sheet row, so it goes with it.
  const placeholders = absent.filter((m) => isPendingMid(m.dotpeMid));
  for (const p of placeholders) {
    await prisma.$transaction([
      prisma.supportRequest.updateMany({
        where: { merchantId: p.id },
        data: { merchantId: null, merchantNameFreeText: p.brandName },
      }),
      prisma.merchant.delete({ where: { id: p.id } }),
    ]);
  }

  const { count } = await prisma.merchant.updateMany({
    where: {
      id: { in: absent.filter((m) => !isPendingMid(m.dotpeMid)).map((m) => m.id) },
      OR: [
        { paymentCollected: { not: 0 } },
        { subscriptionRevenue: { not: 0 } },
        { closedBranches: { not: 0 } },
        { pendingBranches: { not: 0 } },
        { pendingPotentialClosure: { not: 0 } },
        { perOutletCommercials: { not: 0 } },
        { crmActivationConfirmed: true },
      ],
    },
    data: {
      paymentCollected: 0,
      subscriptionRevenue: 0,
      closedBranches: 0,
      pendingBranches: 0,
      pendingPotentialClosure: 0,
      perOutletCommercials: 0,
      crmActivationConfirmed: false,
    },
  });

  return count + placeholders.length;
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

  // Each row updates a different merchant (independent writes), so run them
  // with bounded concurrency instead of one at a time — sequential awaits
  // over ~45 rows was a meaningful chunk of why this sync felt like it hung.
  const outcomes = await mapWithConcurrency(rows, 8, async (row) => {
    const idsRaw = pick(row, "dotpe_merchant_ids");
    const ids = (idsRaw ?? "").split("||").map(normalizeMid).filter(Boolean);
    const dotpeMid = ids[0];
    if (!dotpeMid) return { matched: 0, skipped: 1 };

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
      return { matched: result.count, skipped: 0 };
    } catch (error) {
      console.error(`syncCrmGtmDemoSheet: skipped MID ${dotpeMid}`, error);
      return { matched: 0, skipped: 0 };
    }
  });

  let matched = 0;
  let skipped = 0;
  for (const o of outcomes) {
    matched += o.matched;
    skipped += o.skipped;
  }

  return { matched, skipped };
}

/**
 * "CRM [Product] / Roadmap" tab — full replace on every sync (not a
 * per-merchant table, no stable natural key across syncs to upsert against;
 * the sheet itself is the source of truth for the whole list). Only
 * replaces sheet-sourced rows (isManual: false) — manually-created "product
 * ticket" rows from the app's own CRUD are never touched, so they survive
 * the next sync instead of being wiped by the blanket delete.
 */
export async function syncRoadmap() {
  const source = GSHEET_SOURCES.roadmap;
  const title = await resolveSheetTitleByGid(source.spreadsheetId, source.gid);
  const rows = await readSheetAsObjects(source.spreadsheetId, title, source.headerRow);

  const items = rows
    .map((row) => {
      const rawStatus = pick(row, "status") ?? "";
      return {
        theme: pick(row, "theme") ?? null,
        title: pick(row, "title"),
        ticketUrl: pick(row, "tickets") ?? null,
        design: pick(row, "design") ?? null,
        rista: pick(row, "rista") ?? null,
        priority: pick(row, "priority") ?? null,
        usp: !!pick(row, "usp"),
        // status is the pure lifecycle stage now; the sheet's original
        // value (which may be a category label, not a stage) is preserved
        // in type instead — see mapRoadmapLifecycleStatus.
        status: mapRoadmapLifecycleStatus(rawStatus),
        type: rawStatus || null,
        goLiveDate: pick(row, "go live") ?? null,
        manpowerWeeks: parseAmount(pick(row, "manpower weeks")) ?? null,
        description: pick(row, "description") ?? null,
        brandSignal: pick(row, "brand signal") ?? null,
        why: pick(row, "why") ?? null,
      };
    })
    .filter((item): item is typeof item & { title: string } => !!item.title);

  // A human can move a sheet-sourced item's status via the in-app dropdown
  // (updateRoadmapStatus), which stamps statusOverriddenAt. Without this,
  // the delete+recreate below silently reverted that change back to
  // whatever the sheet's own status column said the very next sync —
  // usually stale, since ops tracks lifecycle in this app, not the sheet.
  // Matched by title (the only field every row is required to have and the
  // one this sync already treats as identity via the filter above) since
  // rows get fresh ids every sync and there's no other stable key.
  const overridden = await prisma.roadmapItem.findMany({
    where: { isManual: false, statusOverriddenAt: { not: null } },
    select: { title: true, status: true, statusOverriddenAt: true },
  });
  const overrideByTitle = new Map(overridden.map((o) => [o.title, o]));

  const finalItems = items.map((item) => {
    const override = overrideByTitle.get(item.title);
    if (!override) return item;
    return { ...item, status: override.status, statusOverriddenAt: override.statusOverriddenAt };
  });

  await prisma.$transaction([
    prisma.roadmapItem.deleteMany({ where: { isManual: false } }),
    ...(finalItems.length > 0 ? [prisma.roadmapItem.createMany({ data: finalItems })] : []),
  ]);

  return { count: finalItems.length };
}

export async function syncGsheets() {
  return withSyncRun("GSHEETS", async () => ({
    crmActive: await runStep("crmActive", syncCrmActiveSheet),
    crmGtmDemo: await runStep("crmGtmDemo", syncCrmGtmDemoSheet),
    crmLoyaltyClosures: await runStep("crmLoyaltyClosures", syncCrmLoyaltyClosuresSheet),
    roadmap: await runStep("roadmap", syncRoadmap),
    loyaltyOnboarding: await runStep("loyaltyOnboarding", syncLoyaltyOnboarding),
  }));
}
