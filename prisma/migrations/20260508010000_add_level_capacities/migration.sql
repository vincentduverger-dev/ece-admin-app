-- CreateTable
CREATE TABLE "LevelCapacity" (
    "id" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "availablePlaces" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LevelCapacity_schoolYearId_levelId_key" ON "LevelCapacity"("schoolYearId", "levelId");

-- CreateIndex
CREATE INDEX "LevelCapacity_schoolYearId_idx" ON "LevelCapacity"("schoolYearId");

-- CreateIndex
CREATE INDEX "LevelCapacity_levelId_idx" ON "LevelCapacity"("levelId");

-- AddForeignKey
ALTER TABLE "LevelCapacity" ADD CONSTRAINT "LevelCapacity_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelCapacity" ADD CONSTRAINT "LevelCapacity_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill campaign-specific capacities from the previous global level value.
INSERT INTO "LevelCapacity" ("id", "schoolYearId", "levelId", "availablePlaces", "createdAt", "updatedAt")
SELECT
    concat('levelcap_', substr(md5(sy."id" || ':' || l."id"), 1, 24)),
    sy."id",
    l."id",
    l."availablePlaces",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "SchoolYear" sy
CROSS JOIN "Level" l
ON CONFLICT ("schoolYearId", "levelId") DO NOTHING;
