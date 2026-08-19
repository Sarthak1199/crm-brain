-- Merchant: ops-confirmed CRM activation, sourced only from the closures sheet
ALTER TABLE "Merchant" ADD COLUMN "crmActivationConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- SupportRequest: product remarks + updatedAt for edit tracking
ALTER TABLE "SupportRequest" ADD COLUMN "productRemarks" TEXT;
ALTER TABLE "SupportRequest" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
