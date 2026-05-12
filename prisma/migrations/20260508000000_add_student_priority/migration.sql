ALTER TABLE "Student" ADD COLUMN "isPriority" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Student"
SET "isPriority" = true
FROM "Application"
WHERE "Student"."applicationId" = "Application"."id"
  AND "Application"."isPriority" = true;

CREATE INDEX "Student_isPriority_idx" ON "Student"("isPriority");
