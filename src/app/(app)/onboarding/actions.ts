"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appendRow, resolveSheetTitleByGid } from "@/lib/gsheets";
import { GSHEET_SOURCES } from "@/lib/sync/gsheet-sources";
import { normalizeMid } from "@/lib/sync/mid";
import { canMutate } from "@/lib/authz";

/** Formats a Date as the sheet's own "DD/MM/YYYY HH:mm:ss" IST wall-clock format. */
function formatTimestampIST(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = ist.getUTCFullYear();
  const hh = String(ist.getUTCHours()).padStart(2, "0");
  const min = String(ist.getUTCMinutes()).padStart(2, "0");
  const ss = String(ist.getUTCSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

export async function createOnboardingRequest(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return "Not signed in.";
  if (!canMutate(session?.user?.role)) return "You don't have permission to make changes here.";

  const businessName = formData.get("businessName");
  const enterpriseMerchantId = formData.get("enterpriseMerchantId");
  const ristaBusinessId = formData.get("ristaBusinessId");
  const ristaBrandId = formData.get("ristaBrandId");
  const ristaBranchId = formData.get("ristaBranchId");
  const branchCode = formData.get("branchCode");
  const storeCode = formData.get("storeCode");
  const enterpriseStoreId = formData.get("enterpriseStoreId");
  const loyaltyType = formData.get("loyaltyType");
  const automation = formData.get("automation") === "on";
  const dotpeUsername = formData.get("dotpeUsername");
  const crmLicenseRequested = formData.get("crmLicenseRequested") === "on";
  const additionalComment = formData.get("additionalComment");

  if (typeof businessName !== "string" || !businessName.trim()) {
    return "Business name is required.";
  }
  if (typeof enterpriseMerchantId !== "string" || !enterpriseMerchantId.trim()) {
    return "MerchantID (enterprise) is required.";
  }
  if (typeof loyaltyType !== "string" || !loyaltyType) {
    return "Select a loyalty type.";
  }

  const now = new Date();
  const dotpeMid = normalizeMid(enterpriseMerchantId);
  const merchant = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });

  // Column order must match the sheet exactly — this is what the existing
  // BE whitelist job reads.
  const rowValues = [
    formatTimestampIST(now), // Timestamp
    email, // Email address
    businessName.trim(), // Business name
    enterpriseMerchantId.trim(), // MerchantID (enterprise)
    typeof ristaBusinessId === "string" ? ristaBusinessId.trim() : "", // BusinessID (rista)
    typeof ristaBrandId === "string" ? ristaBrandId.trim() : "", // BrandID (rista)
    typeof ristaBranchId === "string" ? ristaBranchId.trim() : "", // BranchID (rista)
    typeof branchCode === "string" ? branchCode.trim() : "", // BranchCode
    typeof storeCode === "string" ? storeCode.trim() : "", // StoreCode
    typeof enterpriseStoreId === "string" ? enterpriseStoreId.trim() : "", // StoreId (enterprise)
    loyaltyType, // Loyalty type
    automation ? "Yes" : "", // Automation?
    typeof dotpeUsername === "string" ? dotpeUsername.trim() : "", // Dotpe username
    crmLicenseRequested ? "Yes" : "", // CRM license enable?
    "", // Is Enabled (DO NOT FILL)
    "", // Enabled At (DO NOT FILL)
    "", // CRM is Enabled (DO NOT FILL)
    "", // CRM enabled At (DO NOT FILL)
    "", // [FRD Response ID] DO NOT REMOVE
    typeof additionalComment === "string" ? additionalComment.trim() : "", // Additional Comment
    "", // (unnamed column in source sheet)
    "", // Remarks
    "", // Template
    "Required", // All Channel loyalty enablement
  ];

  let sheetRowIndex: number;
  try {
    const title = await resolveSheetTitleByGid(
      GSHEET_SOURCES.loyaltyOnboarding.spreadsheetId,
      GSHEET_SOURCES.loyaltyOnboarding.gid
    );
    sheetRowIndex = await appendRow(GSHEET_SOURCES.loyaltyOnboarding.spreadsheetId, title, rowValues);
  } catch (error) {
    console.error("createOnboardingRequest: failed to append to sheet", error);
    return "Could not write to the onboarding sheet. Please try again or contact an admin.";
  }

  await prisma.onboardingRequest.upsert({
    where: { sheetRowIndex },
    create: {
      sheetRowIndex,
      timestamp: now,
      email,
      businessName: businessName.trim(),
      merchantId: merchant?.id ?? null,
      enterpriseMerchantId: enterpriseMerchantId.trim(),
      ristaBusinessId: typeof ristaBusinessId === "string" ? ristaBusinessId.trim() || null : null,
      ristaBrandId: typeof ristaBrandId === "string" ? ristaBrandId.trim() || null : null,
      ristaBranchId: typeof ristaBranchId === "string" ? ristaBranchId.trim() || null : null,
      branchCode: typeof branchCode === "string" ? branchCode.trim() || null : null,
      storeCode: typeof storeCode === "string" ? storeCode.trim() || null : null,
      enterpriseStoreId: typeof enterpriseStoreId === "string" ? enterpriseStoreId.trim() || null : null,
      loyaltyType,
      automation,
      dotpeUsername: typeof dotpeUsername === "string" ? dotpeUsername.trim() || null : null,
      crmLicenseRequested,
      additionalComment: typeof additionalComment === "string" ? additionalComment.trim() || null : null,
      createdViaPlatform: true,
    },
    // If a sync already mirrored this exact row (race with a concurrent
    // sync), don't clobber its BE write-back fields — just tag it as ours.
    update: { createdViaPlatform: true },
  });

  revalidatePath("/onboarding");
  return undefined;
}
