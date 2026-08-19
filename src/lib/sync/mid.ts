/**
 * Merchant IDs move between two representations depending on source: Redash
 * returns them as clean JSON numbers, but any manually-maintained GSheet
 * column (or a value copy-pasted out of Redash's own table UI) can pick up
 * thousands-separator commas — e.g. "20,145" instead of "20145". Every MID
 * used as a join/match key should be run through this first so both sides
 * compare equal.
 */
export function normalizeMid(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).replace(/,/g, "").trim();
}
