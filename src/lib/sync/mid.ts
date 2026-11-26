/**
 * Merchant IDs move between two representations depending on source: Redash
 * returns them as clean JSON numbers, but any manually-maintained GSheet
 * column (or a value copy-pasted out of Redash's own table UI) can pick up
 * thousands-separator commas — e.g. "20,145" instead of "20145". Every MID
 * used as a join/match key should be run through this first so both sides
 * compare equal.
 */
export function normalizeMid(raw: string | number | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (/^\d{1,3}(,\d{2,3})*,\d{3}$/.test(value)) return value.replace(/,/g, "");
  // A cell listing several MIDs ("5850, 12438") resolves to the first one —
  // stripping its commas used to mint a second, fake merchant.
  return value.match(/\d+/)?.[0] ?? "";
}

// Deals close before ops creates the MID; until then the sales-sheet row lives
// under a placeholder keyed by brand name.
const PENDING_MID_PREFIX = "pending:";

export function pendingMid(brandName: string) {
  return PENDING_MID_PREFIX + brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isPendingMid(mid: string) {
  return mid.startsWith(PENDING_MID_PREFIX);
}

export function formatMid(mid: string) {
  return isPendingMid(mid) ? "MID pending" : mid;
}
