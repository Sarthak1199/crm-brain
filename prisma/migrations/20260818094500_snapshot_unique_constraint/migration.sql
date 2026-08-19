-- Drop the non-unique index so it doesn't collide with the new unique one
DROP INDEX IF EXISTS "MerchantSnapshot_merchantId_fieldName_capturedAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "MerchantSnapshot_merchantId_fieldName_capturedAt_key" ON "MerchantSnapshot"("merchantId", "fieldName", "capturedAt");
