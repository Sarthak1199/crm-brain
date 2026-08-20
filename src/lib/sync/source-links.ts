import { REDASH_QUERY_IDS } from "./redash-query-ids";
import { GSHEET_SOURCES, gsheetUrl } from "./gsheet-sources";

const REDASH_BASE_URL = process.env.REDASH_BASE_URL || "https://redash.dotpe.in";

export type SourceLink = { label: string; url: string };

function redashUrl(queryId: number) {
  return `${REDASH_BASE_URL}/queries/${queryId}/source`;
}

const REDASH_QUERY_LABELS = {
  crmAdoption: "Redash: CRM Overview Metrics",
  crmWeeklyTrend: "Redash: Overall Weekly Trend",
  crmCreditPrePost: "Redash: Marketing Credit Pre/Post",
  creditConsumptionBreakup: "Redash: Credit Consumption Breakup (per MID)",
  loyaltyFunnel: "Redash: Loyalty Point Program Funnel",
  loyaltyMessages: "Redash: Loyalty Messages Tracking",
  automationPerRule: "Redash: Per-rule Automation Performance",
} as const;

/** One entry per Redash query id, for linking generically by id. */
export const REDASH_SOURCE_LINKS: Record<number, SourceLink> = Object.fromEntries(
  Object.entries(REDASH_QUERY_IDS).map(([key, id]) => [
    id,
    { label: REDASH_QUERY_LABELS[key as keyof typeof REDASH_QUERY_IDS], url: redashUrl(id) },
  ])
);

export const GSHEET_SOURCE_LINKS: Record<keyof typeof GSHEET_SOURCES, SourceLink> = {
  crmActive: { label: "GSheet: CRM active", url: gsheetUrl(GSHEET_SOURCES.crmActive) },
  crmLoyaltyClosures: {
    label: "GSheet: CRM+Loyalty closures",
    url: gsheetUrl(GSHEET_SOURCES.crmLoyaltyClosures),
  },
  crmGtmDemo: { label: "GSheet: CRM GTM Demo", url: gsheetUrl(GSHEET_SOURCES.crmGtmDemo) },
  roadmap: { label: "GSheet: Product Roadmap", url: gsheetUrl(GSHEET_SOURCES.roadmap) },
  loyaltyOnboarding: {
    label: "GSheet: Loyalty enable",
    url: gsheetUrl(GSHEET_SOURCES.loyaltyOnboarding),
  },
};

// Per-chart source lists, for the small greyed "Source" links under each chart card.
export const CHART_SOURCES = {
  activationFunnel: [
    REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.crmAdoption],
    GSHEET_SOURCE_LINKS.crmActive,
    GSHEET_SOURCE_LINKS.crmLoyaltyClosures,
    GSHEET_SOURCE_LINKS.loyaltyOnboarding,
  ],
  salesStatus: [GSHEET_SOURCE_LINKS.crmLoyaltyClosures],
  creditPrePost: [REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.crmCreditPrePost]],
  creditBreakdown: [REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.creditConsumptionBreakup]],
  wowByMid: [REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.creditConsumptionBreakup]],
  wowOverall: [REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.crmWeeklyTrend]],
  adoptionStats: [
    REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.loyaltyFunnel],
    REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.automationPerRule],
    REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.crmAdoption],
  ],
  customersReached: [
    REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.loyaltyFunnel],
    REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.automationPerRule],
    REDASH_SOURCE_LINKS[REDASH_QUERY_IDS.crmAdoption],
  ],
  productStatus: [GSHEET_SOURCE_LINKS.roadmap],
  onboarding: [GSHEET_SOURCE_LINKS.loyaltyOnboarding],
} satisfies Record<string, SourceLink[]>;
