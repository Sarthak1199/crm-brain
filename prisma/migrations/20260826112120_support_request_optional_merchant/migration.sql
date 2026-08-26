-- Support filing a request against a merchant not yet in the Merchant table
ALTER TABLE "SupportRequest" DROP CONSTRAINT "SupportRequest_merchantId_fkey";
ALTER TABLE "SupportRequest" ALTER COLUMN "merchantId" DROP NOT NULL;
ALTER TABLE "SupportRequest" ADD COLUMN "merchantNameFreeText" TEXT;
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
