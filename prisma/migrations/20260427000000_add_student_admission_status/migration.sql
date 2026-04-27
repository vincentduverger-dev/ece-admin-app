-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'PARTIALLY_ACCEPTED';

-- CreateEnum
CREATE TYPE "StudentAdmissionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'WAITLISTED');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "admissionStatus" "StudentAdmissionStatus" NOT NULL DEFAULT 'PENDING';
