-- AlterTable
ALTER TABLE "OnboardingRequest" ADD COLUMN     "ristaAccountNumber" TEXT,
ADD COLUMN     "loyaltyForAllBranches" BOOLEAN NOT NULL DEFAULT false;
