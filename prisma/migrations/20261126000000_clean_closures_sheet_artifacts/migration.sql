-- Merge merchants minted from a multi-MID sheet cell ("5850 12438") into the first MID's real row.
UPDATE "SupportRequest" s SET "merchantId" = r.id
FROM "Merchant" j JOIN "Merchant" r ON r."dotpeMid" = split_part(j."dotpeMid", ' ', 1)
WHERE s."merchantId" = j.id AND j."dotpeMid" ~ '^[0-9]+( [0-9]+)+$';

UPDATE "OnboardingRequest" o SET "merchantId" = r.id
FROM "Merchant" j JOIN "Merchant" r ON r."dotpeMid" = split_part(j."dotpeMid", ' ', 1)
WHERE o."merchantId" = j.id AND j."dotpeMid" ~ '^[0-9]+( [0-9]+)+$';

DELETE FROM "Merchant" j USING "Merchant" r
WHERE j."dotpeMid" ~ '^[0-9]+( [0-9]+)+$' AND r."dotpeMid" = split_part(j."dotpeMid", ' ', 1);

-- Rista account numbers (all digits) were being stored as brand ids (24-char hex).
UPDATE "Merchant"
SET "accountNumber" = COALESCE("accountNumber", "ristaBrandId"), "ristaBrandId" = NULL
WHERE "ristaBrandId" ~ '^[0-9]+$';
