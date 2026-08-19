-- AlterTable: count of physically closed outlets, from the "outlet closed" column
ALTER TABLE "Merchant" ADD COLUMN "closedBranches" INTEGER NOT NULL DEFAULT 0;
