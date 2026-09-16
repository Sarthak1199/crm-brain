"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv, downloadCsv } from "@/lib/csv";

// Manager-access-and-above gate is enforced by the caller (pass `canExport`
// down from a server component's canMutate(session.user.role) check, same
// pattern as every other permission-gated control in this app) — this
// component itself renders nothing when canExport is false, so there's no
// separate check to keep in sync here.
export function ExportCsvButton<T>({
  rows,
  headers,
  toRow,
  filename,
  canExport,
  className,
}: {
  rows: T[];
  headers: string[];
  toRow: (row: T) => (string | number | boolean | null | undefined)[];
  filename: string;
  canExport: boolean;
  className?: string;
}) {
  if (!canExport) return null;

  function handleExport() {
    const csv = toCsv(headers, rows.map(toRow));
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`${filename}-${stamp}.csv`, csv);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      className={className ?? "h-9 gap-1.5 rounded-lg text-[13px] font-normal"}
    >
      <Download className="size-3.5" />
      Export CSV
    </Button>
  );
}
