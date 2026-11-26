/** Query fragment + mapper so merchant pickers also match on MID and the legal name used on onboarding requests. */
export const MERCHANT_SEARCH_SELECT = {
  id: true,
  brandName: true,
  dotpeMid: true,
  onboardingRequests: { select: { businessName: true } },
} as const;

export function merchantSearchText(m: {
  brandName: string;
  dotpeMid: string;
  onboardingRequests: { businessName: string | null }[];
}) {
  return [m.brandName, m.dotpeMid, ...m.onboardingRequests.map((r) => r.businessName)]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();
}
