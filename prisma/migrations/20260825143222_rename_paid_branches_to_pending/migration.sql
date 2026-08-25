-- Rename to match its actual meaning: this column is sourced from the
-- closures sheet's "Pending outlet closure" column (branches NOT yet
-- closed), not a paid/closed count.
ALTER TABLE "Merchant" RENAME COLUMN "paidBranches" TO "pendingBranches";
