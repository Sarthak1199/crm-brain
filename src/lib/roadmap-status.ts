// Pure dev-lifecycle stage, left to right. Replaces the old mixed set
// (Shipped/In Progress/Groomed as lifecycle, Feature/New Product/Merchant
// ask/Bug/Hygiene feature as category) — the category half now lives in
// RoadmapItem.type instead, see mapRoadmapLifecycleStatus below.
export const KNOWN_ROADMAP_STATUSES = ["To Be Picked", "In Design", "In Tech", "In QA", "Shipped"] as const;

export type RoadmapLifecycleStatus = (typeof KNOWN_ROADMAP_STATUSES)[number];

export const STATUS_TONES: Record<string, string> = {
  "To Be Picked": "border-border bg-muted text-muted-foreground",
  "In Design": "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "In Tech": "border-primary/20 bg-primary/10 text-primary",
  "In QA": "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Shipped: "border-positive/20 bg-positive/10 text-positive-foreground",
};

export function statusToneClass(status: string) {
  return STATUS_TONES[status] ?? "border-border bg-muted text-muted-foreground";
}

// Maps the source sheet's old free-text status column (a mix of lifecycle
// stages and category labels — Shipped/In Progress/Groomed alongside
// Feature/New Product/Merchant ask/Bug/Hygiene feature/blank) onto the new
// 5-value lifecycle enum. Applied both to the one-time backfill of existing
// rows and, going forward, inside syncRoadmap() itself — RoadmapItem rows
// are fully replaced on every sheet sync, so without this the very next
// sync would silently reintroduce the old values.
//
// Only "Shipped" (34 existing rows), "In Progress" (4, mapped to "In
// Tech"), and "Groomed" (2, mapped to "In Design") carried any lifecycle
// signal at all — everything else (Feature/New Product/Merchant ask/Bug/
// Hygiene feature/blank, 63 rows) had none, and defaults to "To Be Picked".
export function mapRoadmapLifecycleStatus(rawStatus: string | null | undefined): RoadmapLifecycleStatus {
  const s = (rawStatus ?? "").trim();
  if (s === "Shipped") return "Shipped";
  if (s === "In Progress") return "In Tech";
  if (s === "Groomed") return "In Design";
  return "To Be Picked";
}

export type TicketLink = { number: string; url: string };

/**
 * ticketUrl is raw sheet text, sometimes multiple "1. url\n2. url" lines.
 * Ticket numbers (e.g. "DM-22") aren't stored separately — they're the last
 * path segment of each Jira URL (".../browse/DM-22"), so parse them from
 * the URL itself rather than adding a column that doesn't exist in the
 * source sheet.
 */
export function parseTicketLinks(raw: string | null): TicketLink[] {
  if (!raw) return [];
  const urls = raw.match(/https?:\/\/\S+/g) ?? [];
  return urls.map((url) => {
    const match = url.match(/\/([A-Z][A-Z0-9]*-\d+)(?:[/?#]|$)/);
    return { number: match?.[1] ?? url, url };
  });
}
