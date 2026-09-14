// Dev-lifecycle stage for a Bug/Feature request — a lighter 3-value set
// than RoadmapItem's 5-value one (no Design/QA split needed at intake).
// null/"" means not yet picked up, shown as "New".
export const KNOWN_REQUEST_STATUSES = ["Picked", "In Tech", "Shipped"] as const;

export type RequestStatus = (typeof KNOWN_REQUEST_STATUSES)[number];

export const REQUEST_STATUS_TONES: Record<string, string> = {
  Picked: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "In Tech": "border-primary/20 bg-primary/10 text-primary",
  Shipped: "border-positive/20 bg-positive/10 text-positive-foreground",
};

export function requestStatusToneClass(status: string) {
  return REQUEST_STATUS_TONES[status] ?? "border-border bg-muted text-muted-foreground";
}
