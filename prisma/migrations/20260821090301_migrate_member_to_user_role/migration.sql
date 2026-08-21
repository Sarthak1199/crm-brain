-- Retire MEMBER in favor of USER (no CRUD, read-only) now that the new
-- enum value has committed in the prior migration.
UPDATE "User" SET role = 'USER' WHERE role = 'MEMBER';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "mustResetPassword" BOOLEAN NOT NULL DEFAULT false;
