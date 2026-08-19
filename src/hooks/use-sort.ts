"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortAccessor<T> = (row: T) => string | number | Date | null | undefined;

/**
 * Generic click-to-sort state + comparator, shared across every sortable
 * table in the app. First click on a column sorts ascending, the next click
 * on the same column flips to descending.
 */
export function useSort<T>(
  rows: T[],
  accessors: Record<string, SortAccessor<T>>,
  initial?: { key: string; direction: SortDirection }
) {
  const [sortKey, setSortKey] = useState<string | null>(initial?.key ?? null);
  const [direction, setDirection] = useState<SortDirection>(initial?.direction ?? "asc");

  function toggleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setDirection("asc");
    } else {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey || !accessors[sortKey]) return rows;
    const accessor = accessors[sortKey];
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      let cmp: number;
      if (av instanceof Date && bv instanceof Date) {
        cmp = av.getTime() - bv.getTime();
      } else if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      }
      return direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, direction, accessors]);

  return { sorted, sortKey, direction, toggleSort };
}
