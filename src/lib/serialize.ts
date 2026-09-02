import type { Merchant, MerchantSnapshot, SupportRequest, RoadmapItem } from "@prisma/client";

const DECIMAL_FIELDS = [
  "paymentCollected",
  "totalYearlyPotential",
  "pendingPotentialClosure",
  "perOutletCommercials",
  "preCrmCredits",
  "postCrmCredits",
  "momCreditConsumption",
  "subscriptionRevenue",
  "creditConsumedL30",
] as const;

export type SerializedMerchant = Omit<Merchant, (typeof DECIMAL_FIELDS)[number]> & {
  [K in (typeof DECIMAL_FIELDS)[number]]: number;
};

export function serializeMerchant(m: Merchant): SerializedMerchant {
  const decimals = Object.fromEntries(DECIMAL_FIELDS.map((f) => [f, Number(m[f])])) as {
    [K in (typeof DECIMAL_FIELDS)[number]]: number;
  };
  return { ...m, ...decimals };
}

export type SerializedSnapshot = Omit<MerchantSnapshot, "value"> & { value: number };

export function serializeSnapshot(s: MerchantSnapshot): SerializedSnapshot {
  return { ...s, value: Number(s.value) };
}

export type SerializedSupportRequest = Omit<SupportRequest, "totalPotential" | "images"> & {
  totalPotential: number;
  images: string[];
};

export function serializeSupportRequest(r: SupportRequest): SerializedSupportRequest {
  return {
    ...r,
    totalPotential: Number(r.totalPotential),
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
  };
}

export type SerializedRoadmapItem = Omit<RoadmapItem, "manpowerWeeks"> & {
  manpowerWeeks: number | null;
};

export function serializeRoadmapItem(r: RoadmapItem): SerializedRoadmapItem {
  return { ...r, manpowerWeeks: r.manpowerWeeks === null ? null : Number(r.manpowerWeeks) };
}
