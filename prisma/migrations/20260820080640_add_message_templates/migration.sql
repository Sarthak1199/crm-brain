-- CreateEnum
CREATE TYPE "TemplateChannel" AS ENUM ('SMS', 'WhatsApp');

-- CreateEnum
CREATE TYPE "TemplateDealType" AS ENUM ('WithDeal', 'WithoutDeal');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('Loyalty', 'Automation', 'Campaign', 'OTP', 'Utility');

-- AlterTable
ALTER TABLE "SupportRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "channel" "TemplateChannel" NOT NULL,
    "dealType" "TemplateDealType" NOT NULL,
    "messageText" TEXT NOT NULL,
    "category" "TemplateCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateApproval" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "providerTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Template_channel_idx" ON "Template"("channel");

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "TemplateApproval_merchantId_idx" ON "TemplateApproval"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateApproval_templateId_merchantId_key" ON "TemplateApproval"("templateId", "merchantId");

-- AddForeignKey
ALTER TABLE "TemplateApproval" ADD CONSTRAINT "TemplateApproval_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateApproval" ADD CONSTRAINT "TemplateApproval_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
