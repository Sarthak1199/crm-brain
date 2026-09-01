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

function requiredText(formData: FormData, field: string, label: string): { error: string } | { value: string } {
  const raw = formData.get(field);
  if (typeof raw !== "string" || !raw.trim()) {
    return { error: `${label} is required.` };
  }
  return { value: raw.trim() };
}

export async function createOnboardingRequest(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return "Not signed in.";
  if (!canMutate(session?.user?.role)) return "You don't have permission to make changes here.";

  const businessName = requiredText(formData, "businessName", "Business name");
  if ("error" in businessName) return businessName.error;
  const enterpriseMerchantId = requiredText(formData, "enterpriseMerchantId", "MerchantID (enterprise)");
  if ("error" in enterpriseMerchantId) return enterpriseMerchantId.error;
  const ristaBusinessId = requiredText(formData, "ristaBusinessId", "BusinessID (Rista)");
  if ("error" in ristaBusinessId) return ristaBusinessId.error;
  const ristaBrandId = requiredText(formData, "ristaBrandId", "BrandID (Rista)");
  if ("error" in ristaBrandId) return ristaBrandId.error;
  const ristaAccountNumber = requiredText(formData, "ristaAccountNumber", "Rista account number");
  if ("error" in ristaAccountNumber) return ristaAccountNumber.error;
  const ristaBranchId = requiredText(formData, "ristaBranchId", "BranchID (Rista)");
  if ("error" in ristaBranchId) return ristaBranchId.error;
  const branchCode = requiredText(formData, "branchCode", "BranchCode");
  if ("error" in branchCode) return branchCode.error;
  const storeCode = requiredText(formData, "storeCode", "StoreCode");
  if ("error" in storeCode) return storeCode.error;
  const enterpriseStoreId = requiredText(formData, "enterpriseStoreId", "StoreId (enterprise)");
  if ("error" in enterpriseStoreId) return enterpriseStoreId.error;
  const dotpeUsername = requiredText(formData, "dotpeUsername", "Dotpe username");
  if ("error" in dotpeUsername) return dotpeUsername.error;

  const loyaltyChecked = formData.get("loyaltyChecked") === "on";
  const crmChecked = formData.get("crmChecked") === "on";
  const automationChecked = formData.get("automationChecked") === "on";
  if (!loyaltyChecked && !crmChecked && !automationChecked) {
    return "Check at least one of Loyalty, CRM, or Automation.";
  }

  const loyaltyTypeRaw = formData.get("loyaltyType");
  let loyaltyType: string | null = null;
  if (loyaltyChecked) {
    if (typeof loyaltyTypeRaw !== "string" || !loyaltyTypeRaw) {
      return "Select a loyalty type.";
    }
    loyaltyType = loyaltyTypeRaw;
  }
  const loyaltyForAllBranches = loyaltyChecked && formData.get("loyaltyForAllBranches") === "on";

  const additionalComment = formData.get("additionalComment");

  const now = new Date();
  const dotpeMid = normalizeMid(enterpriseMerchantId.value);
  const merchant = await prisma.merchant.findUnique({ where: { dotpeMid }, select: { id: true } });

  // Column order must match the live sheet's header row exactly (verified
  // directly against the sheet, not assumed) — this is what the existing
  // BE whitelist job reads.
  const rowValues = [
    formatTimestampIST(now), // Timestamp
    email, // Email address
    businessName.value, // Business name
    enterpriseMerchantId.value, // MerchantID (enterprise)
    ristaBusinessId.value, // BusinessID (rista)
    ristaBrandId.value, // BrandID (rista)
    ristaAccountNumber.value, // Rista account number
    ristaBranchId.value, // BranchID (rista)
    branchCode.value, // BranchCode
    storeCode.value, // StoreCode
    enterpriseStoreId.value, // StoreId (enterprise)
    loyaltyType ?? "", // Loyalty type
    automationChecked ? "Yes" : "", // Automation?
    dotpeUsername.value, // Dotpe username
    crmChecked ? "Yes" : "", // CRM license enable?
    "", // Is Enabled (DO NOT FILL)
    "", // Enabled At (DO NOT FILL)
    "", // CRM is Enabled (DO NOT FILL)
    "", // CRM enabled At (DO NOT FILL)
    "", // [FRD Response ID] DO NOT REMOVE
    typeof additionalComment === "string" ? additionalComment.trim() : "", // Additional Comments
    loyaltyForAllBranches ? "Yes" : "", // Enable loyalty for all branches
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
      businessName: businessName.value,
      merchantId: merchant?.id ?? null,
      enterpriseMerchantId: enterpriseMerchantId.value,
      ristaBusinessId: ristaBusinessId.value,
      ristaBrandId: ristaBrandId.value,
      ristaAccountNumber: ristaAccountNumber.value,
      ristaBranchId: ristaBranchId.value,
      branchCode: branchCode.value,
      storeCode: storeCode.value,
      enterpriseStoreId: enterpriseStoreId.value,
      loyaltyType,
      loyaltyForAllBranches,
      automation: automationChecked,
      dotpeUsername: dotpeUsername.value,
      crmLicenseRequested: crmChecked,
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
