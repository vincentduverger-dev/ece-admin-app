-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'ACCEPTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "StudentGender" AS ENUM ('BOY', 'GIRL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('ACCEPTANCE', 'REFUSAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EmailSendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "SchoolYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "fatherLastName" TEXT,
    "fatherFirstName" TEXT,
    "fatherCity" TEXT,
    "motherLastName" TEXT,
    "motherFirstName" TEXT,
    "motherCity" TEXT,
    "familyStatus" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "postalAddress" TEXT,
    "googleAccountEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "declaredChildrenCount" INTEGER,
    "discoverySource" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'RECEIVED',
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "decisionAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "rawCsvRowHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "gender" "StudentGender" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" TIMESTAMP(3) NOT NULL,
    "rankInForm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "availablePlaces" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEmailLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "emailType" "EmailType" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodySnapshot" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sendStatus" "EmailSendStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_label_key" ON "SchoolYear"("label");

-- CreateIndex
CREATE INDEX "Family_contactEmail_idx" ON "Family"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Application_rawCsvRowHash_key" ON "Application"("rawCsvRowHash");

-- CreateIndex
CREATE INDEX "Application_familyId_idx" ON "Application"("familyId");

-- CreateIndex
CREATE INDEX "Application_schoolYearId_idx" ON "Application"("schoolYearId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_isPriority_idx" ON "Application"("isPriority");

-- CreateIndex
CREATE INDEX "Student_applicationId_idx" ON "Student"("applicationId");

-- CreateIndex
CREATE INDEX "Student_levelId_idx" ON "Student"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");

-- CreateIndex
CREATE INDEX "Level_sortOrder_idx" ON "Level"("sortOrder");

-- CreateIndex
CREATE INDEX "ApplicationEmailLog_applicationId_idx" ON "ApplicationEmailLog"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationEmailLog_sendStatus_idx" ON "ApplicationEmailLog"("sendStatus");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEmailLog" ADD CONSTRAINT "ApplicationEmailLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
