UPDATE "Application"
SET "status" = 'IN_REVIEW'
WHERE "status" = 'RECEIVED';

ALTER TABLE "Application"
ALTER COLUMN "status" SET DEFAULT 'IN_REVIEW';
