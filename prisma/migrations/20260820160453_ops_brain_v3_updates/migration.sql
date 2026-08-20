-- Drop the old per-(template,merchant) approval table; being replaced with
-- a per-template submission-lifecycle shape. No production data exists yet
-- (0 rows), so no migration of existing approvals is needed.
DROP TABLE "TemplateApproval";

-- Templates are being fully re-imported under the new category/handle
-- mapping in the same deploy, so no existing rows need to survive this.
TRUNCATE TABLE "Template";

-- TemplateCategory: OTP merged into Utility. Postgres can't drop an enum
-- value directly, so recreate the type (table is empty, so the USING cast
-- is a no-op in practice, but written correctly regardless).
CREATE TYPE "TemplateCategory_new" AS ENUM ('Loyalty', 'Automation', 'Campaign', 'Utility');
ALTER TABLE "Template" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Template" ALTER COLUMN "category" TYPE "TemplateCategory_new" USING (
  CASE WHEN "category"::text = 'OTP' THEN 'Utility' ELSE "category"::text END::"TemplateCategory_new"
);
DROP TYPE "TemplateCategory";
ALTER TYPE "TemplateCategory_new" RENAME TO "TemplateCategory";

-- CreateEnum
CREATE TYPE "TemplateHandle" AS ENUM ('Merchant', 'RistaByDotpe', 'DotpeCRM');

-- AlterTable
ALTER TABLE "Template" ADD COLUMN "handle" "TemplateHandle";

-- CreateEnum
CREATE TYPE "TemplateApprovalStatus" AS ENUM ('Submitted', 'Approved');

-- CreateTable
CREATE TABLE "TemplateApproval" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "approvalStatus" "TemplateApprovalStatus" NOT NULL DEFAULT 'Submitted',
    "eventId" TEXT,
    "providerTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateApproval_templateId_idx" ON "TemplateApproval"("templateId");

-- AddForeignKey
ALTER TABLE "TemplateApproval" ADD CONSTRAINT "TemplateApproval_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: RoadmapItem CRUD support
ALTER TABLE "RoadmapItem" ADD COLUMN "designAttachment" TEXT;
ALTER TABLE "RoadmapItem" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;
