-- CreateEnum
CREATE TYPE "CsvImportStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "CsvImportLog" (
    "id" TEXT NOT NULL,
    "schoolYearId" TEXT,
    "fileName" TEXT,
    "importedFamilies" INTEGER NOT NULL DEFAULT 0,
    "importedApplications" INTEGER NOT NULL DEFAULT 0,
    "importedStudents" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "status" "CsvImportStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CsvImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CsvImportLog_schoolYearId_idx" ON "CsvImportLog"("schoolYearId");

-- CreateIndex
CREATE INDEX "CsvImportLog_createdAt_idx" ON "CsvImportLog"("createdAt");

-- CreateIndex
CREATE INDEX "CsvImportLog_status_idx" ON "CsvImportLog"("status");

-- AddForeignKey
ALTER TABLE "CsvImportLog" ADD CONSTRAINT "CsvImportLog_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
