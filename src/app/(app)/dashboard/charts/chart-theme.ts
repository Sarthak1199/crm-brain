import type { CSSProperties } from "react";

export const CHART_BRAND = "#1188EF";
export const CHART_GRAY = "#64748B";
export const CHART_GRID = "#E5E9F0";
export const CHART_AXIS = "#64748B";

export const tooltipContentStyle: CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  fontSize: 12,
  padding: "8px 10px",
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
};

export const tooltipLabelStyle: CSSProperties = {
  color: "var(--color-muted-foreground)",
  fontWeight: 500,
  marginBottom: 2,
};

export const SERIES_COLORS = [CHART_BRAND, "#F59E0B", "#10B981", "#8B5CF6", "#0B1220"];
