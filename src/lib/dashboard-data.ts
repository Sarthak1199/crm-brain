import type { SerializedMerchant, SerializedSnapshot, SerializedRoadmapItem, SerializedSupportRequest } from "@/lib/serialize";

export type FunnelStage = {
  stage: string;
  count: number;
};

function isTargeted(m: SerializedMerchant) {
  return m.crmTarget === "Yes";
}
function hasDemo(m: SerializedMerchant) {
  return !!m.lastDemoStatus;
}
// Deliberately not crmStatus (Redash) — the funnel's Paid count must reflect
// only ops-confirmed closures from the CRM Sales "CRM+Loyalty closures" tab,
// which is a narrower, ground-truth set than everything Redash calls "A".
// Also deliberately not crmActivationConfirmed: that tracks CRM system
// activation, a separate later step from the sale itself closing (same
// reasoning salesStatus() below already uses for its own INR figure) — a
// merchant with closed outlets on this sheet is a paid customer whether or
// not CRM access has been switched on yet, and gating on activation here
// undercounted the funnel's own later "CRM activated" stage into "Paid".
function isPaid(m: SerializedMerchant) {
  return m.closedBranches > 0;
}
function hasLoyaltyActive(m: SerializedMerchant) {
  return m.loyaltyStatus === "Active";
}
function hasCampaignsActive(m: SerializedMerchant) {
  return m.campaignsSetup > 0;
}
function hasAutomationsActive(m: SerializedMerchant) {
  return Array.isArray(m.automationsRules) && (m.automationsRules as string[]).length > 0;
}

export function activationFunnelByMx(
  merchants: SerializedMerchant[],
  crmActivatedIds: Set<string>
): FunnelStage[] {
  return [
    { stage: "Target", count: merchants.filter(isTargeted).length },
    { stage: "Demo", count: merchants.filter(hasDemo).length },
    { stage: "Paid", count: merchants.filter(isPaid).length },
    { stage: "Loyalty active", count: merchants.filter(hasLoyaltyActive).length },
    { stage: "Campaigns active", count: merchants.filter(hasCampaignsActive).length },
    { stage: "Automations active", count: merchants.filter(hasAutomationsActive).length },
    { stage: "CRM activated", count: merchants.filter((m) => crmActivatedIds.has(m.id)).length },
  ];
}

export function activationFunnelByBranches(
  merchants: SerializedMerchant[],
  crmActivatedIds: Set<string>
): FunnelStage[] {
  const sum = (list: SerializedMerchant[], key: keyof SerializedMerchant) =>
    list.reduce((acc, m) => acc + Number(m[key] ?? 0), 0);

  return [
    { stage: "Target", count: sum(merchants.filter(isTargeted), "totalStores") },
    { stage: "Demo", count: sum(merchants.filter(hasDemo), "totalStores") },
    { stage: "Paid", count: sum(merchants.filter(isPaid), "closedBranches") },
    { stage: "Loyalty active", count: sum(merchants.filter(hasLoyaltyActive), "closedBranches") },
    { stage: "Campaigns active", count: sum(merchants.filter(hasCampaignsActive), "closedBranches") },
    { stage: "Automations active", count: sum(merchants.filter(hasAutomationsActive), "closedBranches") },
    {
      stage: "CRM activated",
      count: sum(merchants.filter((m) => crmActivatedIds.has(m.id)), "closedBranches"),
    },
  ];
}

export function salesStatus(merchants: SerializedMerchant[]) {
  const totalPotentialInr = merchants.reduce((a, m) => a + m.totalYearlyPotential, 0);
  // Every row in the closures sheet with a matched MID and a payment figure
  // is a real closure — sum it directly. crmActivationConfirmed tracks a
  // separate later step (CRM activation), not whether the sale closed, so
  // gating on it here undercounts confirmed, ops-verified income.
  const closedInr = merchants.reduce((a, m) => a + m.paymentCollected, 0);
  const pendingInr = Math.max(totalPotentialInr - closedInr, 0);

  // Sourced directly from the GSheet, not computed: pendingBranches is the
  // "pending outlet closure" column (outlets still open) and closedBranches
  // is the "outlet closed" column — both per-merchant counts maintained by
  // ops, not derived from activeDineInStores (which has no data source).
  const pendingBranches = merchants.reduce((a, m) => a + m.pendingBranches, 0);
  const closedBranches = merchants.reduce((a, m) => a + m.closedBranches, 0);

  return {
    inr: { pending: pendingInr, closed: closedInr },
    branches: { pending: pendingBranches, closed: closedBranches },
    totalCollectedInr: closedInr,
    totalCollectedBranches: closedBranches,
  };
}

// Charts "by MID" don't scale to a full merchant roster (100+ real Mx) —
// cap to the top N by the metric being charted so bars/lines/legends stay
// readable. A caller that has actively filtered down to a handful of
// merchants (via the dashboard's Mx filter) will naturally see all of them
// since the cap only kicks in above `limit`.
const BAR_CHART_LIMIT = 10;
const LINE_CHART_LIMIT = 6;
// Customers Reached asks for at least 15 Mx visible in the bar chart itself
// (separate from the general BAR_CHART_LIMIT so other charts stay as dense
// as before).
const CUSTOMERS_REACHED_CHART_LIMIT = 15;

export function creditsByMid(merchants: SerializedMerchant[], limit = BAR_CHART_LIMIT) {
  return [...merchants]
    .sort((a, b) => b.preCrmCredits + b.postCrmCredits - (a.preCrmCredits + a.postCrmCredits))
    .slice(0, limit)
    .map((m) => ({
      name: m.brandName,
      pre: m.preCrmCredits,
      post: m.postCrmCredits,
    }));
}

// Sums the per-week campaign/automation/loyalty snapshots (from Redash query
// 11147, synced weekly) that fall inside the selected date range — genuinely
// date-filterable, unlike the old lifetime-only Merchant.creditConsumptionBreakup.
export function creditBreakupByMid(
  merchants: SerializedMerchant[],
  snapshotsByMerchant: Record<string, SerializedSnapshot[]>,
  dateRange: { from?: string; to?: string } = {},
  limit = BAR_CHART_LIMIT
) {
  function sumField(merchantId: string, fieldName: string) {
    const snaps = snapshotsByMerchant[merchantId] ?? [];
    return snaps
      .filter((s) => s.fieldName === fieldName)
      .filter((s) => {
        const weekKey = new Date(s.capturedAt).toISOString().slice(0, 10);
        if (dateRange.from && weekKey < dateRange.from) return false;
        if (dateRange.to && weekKey > dateRange.to) return false;
        return true;
      })
      .reduce((a, s) => a + s.value, 0);
  }

  const withBreakup = merchants.map((m) => ({
    name: m.brandName,
    campaigns: sumField(m.id, "creditConsumption.campaigns"),
    loyalty: sumField(m.id, "creditConsumption.loyalty"),
    automations: sumField(m.id, "creditConsumption.automations"),
  }));

  return withBreakup
    .map((r) => ({ ...r, total: r.campaigns + r.loyalty + r.automations }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(({ total: _total, ...rest }) => rest);
}

// "Pre vs Post CRM Credits" + "Consumption Breakdown" → View Details table:
// every merchant's pre/post CRM credit totals (lifetime, same source as the
// Pre vs Post chart) alongside the same per-category breakdown as
// creditBreakupTable, so the one table answers both cards' "who and how
// much" questions together.
export function creditConsumptionTable(
  merchants: SerializedMerchant[],
  snapshotsByMerchant: Record<string, SerializedSnapshot[]>,
  dateRange: { from?: string; to?: string } = {}
) {
  function sumField(merchantId: string, fieldName: string) {
    const snaps = snapshotsByMerchant[merchantId] ?? [];
    return snaps
      .filter((s) => s.fieldName === fieldName)
      .filter((s) => {
        const weekKey = new Date(s.capturedAt).toISOString().slice(0, 10);
        if (dateRange.from && weekKey < dateRange.from) return false;
        if (dateRange.to && weekKey > dateRange.to) return false;
        return true;
      })
      .reduce((a, s) => a + s.value, 0);
  }

  return merchants
    .map((m) => {
      const campaigns = sumField(m.id, "creditConsumption.campaigns");
      const loyalty = sumField(m.id, "creditConsumption.loyalty");
      const automations = sumField(m.id, "creditConsumption.automations");
      return {
        id: m.id,
        brandName: m.brandName,
        dotpeMid: m.dotpeMid,
        totalStores: m.totalStores,
        preCrmCredits: m.preCrmCredits,
        postCrmCredits: m.postCrmCredits,
        campaigns,
        loyalty,
        automations,
        total: campaigns + loyalty + automations,
        // From the mxGrain sync (Redash 11166's Customers_Acquired) — not
        // date-range filterable like the fields above, since the grain
        // query has no date_range param; it's a live snapshot as of the
        // last sync.
        customersAcquired: m.grainCustomersAcquired,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function wowCreditTrend(
  merchants: SerializedMerchant[],
  snapshotsByMerchant: Record<string, SerializedSnapshot[]>,
  dateRange: { from?: string; to?: string } = {},
  limit = LINE_CHART_LIMIT
) {
  const topMerchants = [...merchants]
    .sort((a, b) => b.momCreditConsumption - a.momCreditConsumption)
    .slice(0, limit);

  const weekMap = new Map<string, Record<string, number | string>>();

  for (const m of topMerchants) {
    const snaps = (snapshotsByMerchant[m.id] ?? []).filter((s) => s.fieldName === "creditConsumption.total");
    for (const s of snaps) {
      const weekKey = new Date(s.capturedAt).toISOString().slice(0, 10);
      if (dateRange.from && weekKey < dateRange.from) continue;
      if (dateRange.to && weekKey > dateRange.to) continue;
      const entry = weekMap.get(weekKey) ?? { week: weekKey };
      entry[m.brandName] = s.value;
      weekMap.set(weekKey, entry);
    }
  }

  return {
    data: Array.from(weekMap.values()).sort((a, b) => String(a.week).localeCompare(String(b.week))),
    merchantNames: topMerchants.map((m) => m.brandName),
  };
}

export function adoptionStats(merchants: SerializedMerchant[]) {
  const loyaltySetups = merchants.filter((m) => m.loyaltyStatus === "Active").length;
  const automationSetups = merchants.filter(
    (m) => Array.isArray(m.automationsRules) && (m.automationsRules as string[]).length > 0
  ).length;
  const rfmCampaignsSent = merchants.reduce((a, m) => a + m.campaignsUsingRfm, 0);

  return { loyaltySetups, automationSetups, rfmCampaignsSent };
}

// "Customers Reached" chart + its View Details table — distinct customers
// reached per channel (a headcount, from Redash query 11148 via the
// customersReached.* snapshots), genuinely date-range-filterable. This
// used to read lifetime/mismatched fields (total_enrolled, a cumulative
// automations-sent counter, a non-date-filterable contacts total from the
// CRM Overview query) that neither matched "customers reached" nor
// responded to the dashboard's date filter at all.
function sumCustomersReachedField(
  snaps: SerializedSnapshot[],
  fieldName: string,
  dateRange: { from?: string; to?: string }
) {
  return snaps
    .filter((s) => s.fieldName === fieldName)
    .filter((s) => {
      const weekKey = new Date(s.capturedAt).toISOString().slice(0, 10);
      if (dateRange.from && weekKey < dateRange.from) return false;
      if (dateRange.to && weekKey > dateRange.to) return false;
      return true;
    })
    .reduce((a, s) => a + s.value, 0);
}

export function customersReachedByChannel(
  merchants: SerializedMerchant[],
  snapshotsByMerchant: Record<string, SerializedSnapshot[]>,
  dateRange: { from?: string; to?: string } = {},
  limit = CUSTOMERS_REACHED_CHART_LIMIT
) {
  return merchants
    .map((m) => {
      const snaps = snapshotsByMerchant[m.id] ?? [];
      const campaigns = sumCustomersReachedField(snaps, "customersReached.campaigns", dateRange);
      const loyalty = sumCustomersReachedField(snaps, "customersReached.loyalty", dateRange);
      const automations = sumCustomersReachedField(snaps, "customersReached.automations", dateRange);
      return { name: m.brandName, campaigns, loyalty, automations, total: campaigns + loyalty + automations };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(({ total: _total, ...rest }) => rest);
}

export function customersReachedTable(
  merchants: SerializedMerchant[],
  snapshotsByMerchant: Record<string, SerializedSnapshot[]>,
  dateRange: { from?: string; to?: string } = {}
) {
  return merchants
    .map((m) => {
      const snaps = snapshotsByMerchant[m.id] ?? [];
      const campaigns = sumCustomersReachedField(snaps, "customersReached.campaigns", dateRange);
      const loyalty = sumCustomersReachedField(snaps, "customersReached.loyalty", dateRange);
      const automations = sumCustomersReachedField(snaps, "customersReached.automations", dateRange);
      return {
        id: m.id,
        brandName: m.brandName,
        dotpeMid: m.dotpeMid,
        totalStores: m.totalStores,
        campaigns,
        loyalty,
        automations,
        total: campaigns + loyalty + automations,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/**
 * Dev-lifecycle waterfall, left to right. `status` is now a pure 5-value
 * lifecycle field (see mapRoadmapLifecycleStatus in roadmap-status.ts) —
 * every item falls into exactly one of these stages directly, no longer
 * derived from the `design` column.
 */
export function productStatusStages(items: SerializedRoadmapItem[]): FunnelStage[] {
  const count = (stage: string) => items.filter((i) => i.status === stage).length;

  return [
    { stage: "To Be Picked", count: count("To Be Picked") },
    { stage: "In Design", count: count("In Design") },
    { stage: "In Tech", count: count("In Tech") },
    { stage: "In QA", count: count("In QA") },
    { stage: "Shipped", count: count("Shipped") },
  ];
}

export function requestTypeStats(requests: SerializedSupportRequest[]) {
  const byType = (type: "Bug" | "Feature") => {
    const list = requests.filter((r) => r.type === type);

    // Each individual ask is its own request row (for the count), but a
    // merchant's branches/potential describe the merchant, not the ask —
    // summing per row would multiply them by however many requests that
    // merchant has logged. Count each merchant's footprint once per type.
    // A request with no real merchant (a freshly-typed name) has no shared
    // identity to dedupe against — falls back to its own request id.
    const perMerchant = new Map<string, { totalBranches: number; totalPotential: number }>();
    for (const r of list) {
      const key = r.merchantId ?? r.id;
      if (!perMerchant.has(key)) {
        perMerchant.set(key, { totalBranches: r.totalBranches, totalPotential: r.totalPotential });
      }
    }

    return {
      count: list.length,
      branches: Array.from(perMerchant.values()).reduce((a, r) => a + r.totalBranches, 0),
      potential: Array.from(perMerchant.values()).reduce((a, r) => a + r.totalPotential, 0),
    };
  };

  return { bug: byType("Bug"), feature: byType("Feature") };
}
