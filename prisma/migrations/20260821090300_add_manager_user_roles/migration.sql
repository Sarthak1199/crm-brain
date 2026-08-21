-- AlterEnum
-- Split into its own migration: Postgres won't let a new enum value be
-- used (in an UPDATE, a new column default, etc.) in the same transaction
-- that adds it.
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'USER';
