-- CrmStatus now represents the real CRM license state from Redash query
-- 10505's crm_status field (A/P/E), not a rough Paid/Pilot sales-stage
-- approximation. Every existing row is currently 'Paid' (Redash has never
-- returned anything but 'A' in practice), so this is a clean 1:1 remap;
-- 'Pilot' is mapped defensively even though no rows currently use it.
ALTER TABLE "Merchant" ALTER COLUMN "crmStatus" DROP DEFAULT;
ALTER TABLE "Merchant" ALTER COLUMN "crmStatus" TYPE TEXT USING ("crmStatus"::TEXT);

UPDATE "Merchant" SET "crmStatus" = 'Active' WHERE "crmStatus" = 'Paid';
UPDATE "Merchant" SET "crmStatus" = 'NA' WHERE "crmStatus" = 'Pilot';

DROP TYPE "CrmStatus";
CREATE TYPE "CrmStatus" AS ENUM ('NA', 'Active', 'Paused', 'Expired');

ALTER TABLE "Merchant" ALTER COLUMN "crmStatus" TYPE "CrmStatus" USING ("crmStatus"::"CrmStatus");
ALTER TABLE "Merchant" ALTER COLUMN "crmStatus" SET DEFAULT 'NA';
