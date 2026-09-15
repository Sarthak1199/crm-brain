import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "66fa57666165aeb95af635d883daa8aca83db017a8d56744";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const merchantCount = await prisma.merchant.count();
  const grainHasLoyaltyTrue = await prisma.merchant.count({ where: { grainHasLoyalty: true } });
  const grainHasCrmTrue = await prisma.merchant.count({ where: { grainHasCrm: true } });
  const loyaltyStatusActive = await prisma.merchant.count({ where: { loyaltyStatus: "Active" } });

  const onboardingLoyaltyEnabledCount = await prisma.onboardingRequest.count({ where: { loyaltyEnabled: true } });
  const onboardingLoyaltyEnabledWithMerchant = await prisma.onboardingRequest.count({
    where: { loyaltyEnabled: true, merchantId: { not: null } },
  });
  const distinctMerchantIdsWithLoyaltyEnabled = await prisma.onboardingRequest.findMany({
    where: { loyaltyEnabled: true, merchantId: { not: null } },
    select: { merchantId: true },
    distinct: ["merchantId"],
  });

  const sample = await prisma.merchant.findMany({
    where: { loyaltyStatus: "Active" },
    select: { brandName: true, dotpeMid: true, loyaltyStatus: true, grainHasLoyalty: true, grainHasCrm: true },
    take: 10,
  });

  return NextResponse.json({
    merchantCount,
    grainHasLoyaltyTrue,
    grainHasCrmTrue,
    loyaltyStatusActive,
    onboardingLoyaltyEnabledCount,
    onboardingLoyaltyEnabledWithMerchant,
    distinctMerchantIdsWithLoyaltyEnabledCount: distinctMerchantIdsWithLoyaltyEnabled.length,
    sample,
  });
}
