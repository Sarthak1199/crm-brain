-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "grainBranchesTransactingPosL90" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grainCustomersAcquired" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grainHasCrm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "grainHasLoyalty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "grainSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RoadmapItem" ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT;

-- CreateIndex
CREATE INDEX "Template_eventId_idx" ON "Template"("eventId");
