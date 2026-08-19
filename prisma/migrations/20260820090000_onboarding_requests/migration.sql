CREATE TABLE "OnboardingRequest" (
    "id" TEXT NOT NULL,
    "sheetRowIndex" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3),
    "email" TEXT,
    "businessName" TEXT,
    "merchantId" TEXT,
    "enterpriseMerchantId" TEXT,
    "ristaBusinessId" TEXT,
    "ristaBrandId" TEXT,
    "ristaBranchId" TEXT,
    "branchCode" TEXT,
    "storeCode" TEXT,
    "enterpriseStoreId" TEXT,
    "loyaltyType" TEXT,
    "automation" BOOLEAN NOT NULL DEFAULT false,
    "dotpeUsername" TEXT,
    "crmLicenseRequested" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyEnabledAt" TIMESTAMP(3),
    "crmEnabled" BOOLEAN NOT NULL DEFAULT false,
    "crmEnabledAt" TIMESTAMP(3),
    "additionalComment" TEXT,
    "remarks" TEXT,
    "createdViaPlatform" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingRequest_sheetRowIndex_key" ON "OnboardingRequest"("sheetRowIndex");
CREATE INDEX "OnboardingRequest_merchantId_idx" ON "OnboardingRequest"("merchantId");
CREATE INDEX "OnboardingRequest_loyaltyEnabled_idx" ON "OnboardingRequest"("loyaltyEnabled");
CREATE INDEX "OnboardingRequest_crmEnabled_idx" ON "OnboardingRequest"("crmEnabled");

ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
