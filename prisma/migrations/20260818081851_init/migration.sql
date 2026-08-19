-- CreateEnum
CREATE TYPE "CrmTarget" AS ENUM ('Yes', 'No', 'Maybe');

-- CreateEnum
CREATE TYPE "CrmStatus" AS ENUM ('NA', 'Pilot', 'Paid');

-- CreateEnum
CREATE TYPE "LoyaltyStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "WabaStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "OnboardStatus" AS ENUM ('Onboarded', 'NotOnboarded');

-- CreateEnum
CREATE TYPE "RistaStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "DotpeStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "ristaBrandId" TEXT NOT NULL,
    "dotpeMid" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "pocName" TEXT,
    "pocNumber" TEXT,
    "totalStores" INTEGER NOT NULL DEFAULT 0,
    "activeDineInStores" INTEGER NOT NULL DEFAULT 0,
    "loyaltyActiveStores" INTEGER NOT NULL DEFAULT 0,
    "paidBranches" INTEGER NOT NULL DEFAULT 0,
    "paymentCollectedDate" TIMESTAMP(3),
    "closureDate" TIMESTAMP(3),
    "paymentCollected" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalYearlyPotential" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reeloBranches" INTEGER NOT NULL DEFAULT 0,
    "xenoBranches" INTEGER NOT NULL DEFAULT 0,
    "dotpeBranches" INTEGER NOT NULL DEFAULT 0,
    "fudrBranches" INTEGER NOT NULL DEFAULT 0,
    "easyrewardsBranches" INTEGER NOT NULL DEFAULT 0,
    "crmTarget" "CrmTarget" NOT NULL DEFAULT 'Maybe',
    "lastDemoStatus" TIMESTAMP(3),
    "crmStatus" "CrmStatus" NOT NULL DEFAULT 'NA',
    "crmEnabledOn" TIMESTAMP(3),
    "loyaltyStatus" "LoyaltyStatus" NOT NULL DEFAULT 'Inactive',
    "wabaStatus" "WabaStatus" NOT NULL DEFAULT 'Inactive',
    "onboarded" "OnboardStatus" NOT NULL DEFAULT 'NotOnboarded',
    "ristaStatus" "RistaStatus" NOT NULL DEFAULT 'Inactive',
    "dotpeStatus" "DotpeStatus" NOT NULL DEFAULT 'Inactive',
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "l30Txn" INTEGER NOT NULL DEFAULT 0,
    "preCrmCredits" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "postCrmCredits" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "momCreditConsumption" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditConsumptionBreakup" JSONB,
    "totalContactsReached" INTEGER NOT NULL DEFAULT 0,
    "loyaltyProgram" TEXT,
    "loyaltyPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "loyaltyPointsBurned" INTEGER NOT NULL DEFAULT 0,
    "automationsRules" JSONB,
    "automationsActivateDate" TIMESTAMP(3),
    "automationsTotalSent" INTEGER NOT NULL DEFAULT 0,
    "campaignsSetup" INTEGER NOT NULL DEFAULT 0,
    "campaignsContactsReached" INTEGER NOT NULL DEFAULT 0,
    "campaignsUsingRfm" INTEGER NOT NULL DEFAULT 0,
    "bugRaised" TEXT,
    "featureRequest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantSnapshot" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_ristaBrandId_key" ON "Merchant"("ristaBrandId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_dotpeMid_key" ON "Merchant"("dotpeMid");

-- CreateIndex
CREATE INDEX "Merchant_brandName_idx" ON "Merchant"("brandName");

-- CreateIndex
CREATE INDEX "Merchant_crmStatus_idx" ON "Merchant"("crmStatus");

-- CreateIndex
CREATE INDEX "Merchant_loyaltyStatus_idx" ON "Merchant"("loyaltyStatus");

-- CreateIndex
CREATE INDEX "Merchant_onboarded_idx" ON "Merchant"("onboarded");

-- CreateIndex
CREATE INDEX "MerchantSnapshot_merchantId_fieldName_capturedAt_idx" ON "MerchantSnapshot"("merchantId", "fieldName", "capturedAt");

-- AddForeignKey
ALTER TABLE "MerchantSnapshot" ADD CONSTRAINT "MerchantSnapshot_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
