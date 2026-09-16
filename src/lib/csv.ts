// RFC 4180-ish CSV escaping — quote a field only when it needs it (contains
// a comma, quote, or newline), doubling any embedded quotes.
function escapeCsvField(value: string | number | boolean | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvField).join(","), ...rows.map((r) => r.map(escapeCsvField).join(","))];
  // ﻿: UTF-8 BOM so Excel (still the most common opener) detects the
  // encoding correctly instead of mangling non-ASCII merchant names.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
