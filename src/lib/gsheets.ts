import { google } from "googleapis";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env."
    );
  }
  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    // Full read/write: the onboarding request form appends rows. Read-only
    // sheets still work fine under this broader scope — write access is
    // gated per-sheet by that sheet's own sharing settings, not by scope.
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export function isGsheetsConfigured() {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
}

/** Resolves a numeric tab gid to its sheet title (gid is stable across renames; title is what the Sheets API needs for range refs). */
export async function resolveSheetTitleByGid(spreadsheetId: string, gid: number): Promise<string> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find((s) => s.properties?.sheetId === gid);
  if (!sheet?.properties?.title) {
    throw new Error(`No tab with gid=${gid} found in spreadsheet ${spreadsheetId}`);
  }
  return sheet.properties.title;
}

/**
 * Reads a tab and returns rows keyed by (trimmed, lowercased) header text.
 * `headerRow` is 1-indexed — most tabs have headers on row 1, but some carry
 * a summary/totals block above the real table (e.g. "CRM+Loyalty closures"
 * has its header on row 2).
 */
export async function readSheetAsObjects(
  spreadsheetId: string,
  sheetTitle: string,
  headerRow = 1
): Promise<Record<string, string>[]> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A${headerRow}:ZZ`,
  });

  const values = res.data.values ?? [];
  if (values.length === 0) return [];

  const headers = values[0].map((h) => String(h ?? "").trim().toLowerCase());
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = String(row[i] ?? "").trim();
    });
    return obj;
  });
}

// USER_ENTERED makes Sheets parse strings the way a human typing into the
// cell would — including treating a leading =/+/-/@ as the start of a
// formula. Since these rows carry free text straight from a web form (e.g.
// business name, comments), prefix a leading apostrophe on any such value
// so it lands as literal text instead of executing as a formula when ops
// opens the sheet (CSV/formula injection — see OWASP's CSV Injection).
function sanitizeForSheets(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Appends one row to a tab, matching what a Form submission would produce
 * (USER_ENTERED so date strings land as real dates, not literal text).
 * Returns the 1-indexed row number the data landed on, parsed from the
 * API's updatedRange (e.g. "Sheet!A187:X187" -> 187) — the caller uses this
 * as a stable key to re-read that exact row later (BE write-back columns).
 */
export async function appendRow(
  spreadsheetId: string,
  sheetTitle: string,
  values: (string | number | boolean)[]
): Promise<number> {
  const sanitized = values.map((v) => (typeof v === "string" ? sanitizeForSheets(v) : v));
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetTitle}'!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [sanitized] },
  });

  const updatedRange = res.data.updates?.updatedRange;
  const match = updatedRange?.match(/![A-Z]+(\d+):/);
  if (!match) {
    throw new Error(`Could not determine row number from append response: ${updatedRange}`);
  }
  return Number(match[1]);
}

/** Reads a single row (1-indexed) back out of a tab, keyed like readSheetAsObjects. */
export async function readSheetRow(
  spreadsheetId: string,
  sheetTitle: string,
  rowIndex: number,
  headerRow = 1
): Promise<Record<string, string>> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const [headerRes, rowRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: `'${sheetTitle}'!A${headerRow}:ZZ${headerRow}` }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `'${sheetTitle}'!A${rowIndex}:ZZ${rowIndex}` }),
  ]);

  const headers = (headerRes.data.values?.[0] ?? []).map((h) => String(h ?? "").trim().toLowerCase());
  const row = rowRes.data.values?.[0] ?? [];
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    if (h) obj[h] = String(row[i] ?? "").trim();
  });
  return obj;
}

/** Finds a row value by trying several possible header spellings, case-insensitively. */
export function pick(row: Record<string, string>, ...aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const value = row[alias.toLowerCase()];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}
