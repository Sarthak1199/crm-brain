import { cn } from "@/lib/utils";

type Tone = "positive" | "warning" | "neutral" | "brand" | "negative";

const TONE_CLASSES: Record<Tone, string> = {
  positive: "bg-positive/10 text-positive-foreground border-positive/20",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  neutral: "bg-muted text-muted-foreground border-border",
  brand: "bg-primary/10 text-primary border-primary/20",
  negative: "bg-negative/10 text-negative-foreground border-negative/20",
};

function toneFor(value: string): Tone {
  const v = value.toLowerCase();
  if (["paid", "active", "onboarded", "yes"].includes(v)) return "positive";
  if (["pilot", "maybe", "paused"].includes(v)) return "warning";
  if (["na", "inactive", "notonboarded", "no"].includes(v)) return "neutral";
  if (["expired"].includes(v)) return "negative";
  return "neutral";
}

function labelFor(value: string) {
  if (value === "NotOnboarded") return "Not onboarded";
  if (value === "NA") return "N/A";
  return value;
}

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const tone = toneFor(value);
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      {labelFor(value)}
    </span>
  );
}

export function DeltaPill({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium",
        positive ? "bg-positive/10 text-positive-foreground" : "bg-negative/10 text-negative-foreground"
      )}
    >
      {positive ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}
