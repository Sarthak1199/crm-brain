-- AlterTable: not every DotPe CRM merchant is linked to a Rista brand
ALTER TABLE "Merchant" ALTER COLUMN "ristaBrandId" DROP NOT NULL;
