-- Merchant: join keys + new financial columns
ALTER TABLE "Merchant" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "Merchant" ADD COLUMN "businessId" TEXT;
ALTER TABLE "Merchant" ADD COLUMN "subscriptionRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Merchant" ADD COLUMN "creditConsumedL30" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- SupportRequest
CREATE TYPE "SupportRequestType" AS ENUM ('Bug', 'Feature');

CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" "SupportRequestType" NOT NULL,
    "description" TEXT NOT NULL,
    "images" JSONB,
    "totalBranches" INTEGER NOT NULL DEFAULT 0,
    "totalPotential" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportRequest_merchantId_idx" ON "SupportRequest"("merchantId");
CREATE INDEX "SupportRequest_type_idx" ON "SupportRequest"("type");
CREATE INDEX "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");

ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RoadmapItem
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL,
    "theme" TEXT,
    "title" TEXT NOT NULL,
    "ticketUrl" TEXT,
    "design" TEXT,
    "rista" TEXT,
    "priority" TEXT,
    "usp" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "goLiveDate" TEXT,
    "manpowerWeeks" DECIMAL(6,2),
    "description" TEXT,
    "brandSignal" TEXT,
    "why" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoadmapItem_status_idx" ON "RoadmapItem"("status");
CREATE INDEX "RoadmapItem_priority_idx" ON "RoadmapItem"("priority");
CREATE INDEX "RoadmapItem_theme_idx" ON "RoadmapItem"("theme");
