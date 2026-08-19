export const KNOWN_ROADMAP_STATUSES = [
  "Shipped",
  "In Progress",
  "Groomed",
  "Feature",
  "New Product",
  "Merchant ask",
  "Bug",
  "Hygiene feature",
] as const;

export const STATUS_TONES: Record<string, string> = {
  Shipped: "border-positive/20 bg-positive/10 text-positive-foreground",
  "In Progress": "border-primary/20 bg-primary/10 text-primary",
  Groomed: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  Bug: "border-negative/20 bg-negative/10 text-negative-foreground",
  Feature: "border-primary/20 bg-primary/10 text-primary",
  "New Product": "border-primary/20 bg-primary/10 text-primary",
  "Merchant ask": "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Hygiene feature": "border-border bg-muted text-muted-foreground",
};

export function statusToneClass(status: string) {
  return STATUS_TONES[status] ?? "border-border bg-muted text-muted-foreground";
}
