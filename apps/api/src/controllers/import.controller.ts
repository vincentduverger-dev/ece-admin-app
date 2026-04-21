import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { buildApplicationImportHash, normalizeLevelLookupKey, parseCsvImportFile } from "../lib/csv-import";
import { badRequest, notFound } from "../lib/errors";
import { prisma } from "../prisma/client";

const ACCEPTED_CSV_MIME_TYPES = new Set([
  "application/csv",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain"
]);

const isCsvUpload = (file: Express.Multer.File): boolean => {
  const normalizedFileName = file.originalname.trim().toLowerCase();
  const normalizedMimeType = file.mimetype.trim().toLowerCase();

  if (normalizedFileName.endsWith(".csv")) {
    return true;
  }

  return normalizedMimeType !== "text/plain" && ACCEPTED_CSV_MIME_TYPES.has(normalizedMimeType);
};

const buildLevelLookupMap = (
  levels: Array<{ id: string; code: string; label: string }>
): Map<string, string> => {
  const levelLookup = new Map<string, string>();

  for (const level of levels) {
    levelLookup.set(normalizeLevelLookupKey(level.code), level.id);
    levelLookup.set(normalizeLevelLookupKey(level.label), level.id);
  }

  return levelLookup;
};

const buildFamilyCreateData = (
  family: {
    fatherLastName: string | null;
    fatherFirstName: string | null;
    fatherCity: string | null;
    motherLastName: string | null;
    motherFirstName: string | null;
    motherCity: string | null;
    familyStatus: string | null;
    contactEmail: string;
    contactPhone: string | null;
    postalAddress: string | null;
    googleAccountEmail: string | null;
  }
): Prisma.FamilyCreateInput => {
  return {
    fatherLastName: family.fatherLastName,
    fatherFirstName: family.fatherFirstName,
    fatherCity: family.fatherCity,
    motherLastName: family.motherLastName,
    motherFirstName: family.motherFirstName,
    motherCity: family.motherCity,
    familyStatus: family.familyStatus,
    contactEmail: family.contactEmail,
    contactPhone: family.contactPhone,
    postalAddress: family.postalAddress,
    googleAccountEmail: family.googleAccountEmail
  };
};

const buildFamilyUpdateData = (
  family: {
    fatherLastName: string | null;
    fatherFirstName: string | null;
    fatherCity: string | null;
    motherLastName: string | null;
    motherFirstName: string | null;
    motherCity: string | null;
    familyStatus: string | null;
    contactEmail: string;
    contactPhone: string | null;
    postalAddress: string | null;
    googleAccountEmail: string | null;
  }
): Prisma.FamilyUpdateInput => {
  const updateData: Prisma.FamilyUpdateInput = {
    contactEmail: family.contactEmail
  };

  if (family.fatherLastName !== null) {
    updateData.fatherLastName = family.fatherLastName;
  }

  if (family.fatherFirstName !== null) {
    updateData.fatherFirstName = family.fatherFirstName;
  }

  if (family.fatherCity !== null) {
    updateData.fatherCity = family.fatherCity;
  }

  if (family.motherLastName !== null) {
    updateData.motherLastName = family.motherLastName;
  }

  if (family.motherFirstName !== null) {
    updateData.motherFirstName = family.motherFirstName;
  }

  if (family.motherCity !== null) {
    updateData.motherCity = family.motherCity;
  }

  if (family.familyStatus !== null) {
    updateData.familyStatus = family.familyStatus;
  }

  if (family.contactPhone !== null) {
    updateData.contactPhone = family.contactPhone;
  }

  if (family.postalAddress !== null) {
    updateData.postalAddress = family.postalAddress;
  }

  if (family.googleAccountEmail !== null) {
    updateData.googleAccountEmail = family.googleAccountEmail;
  }

  return updateData;
};

export const importCsv = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;

  if (!file) {
    throw badRequest("CSV file is required");
  }

  if (!isCsvUpload(file)) {
    throw badRequest("Invalid CSV file format");
  }

  const parsedImport = parseCsvImportFile(file.buffer);
  const activeSchoolYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      label: true
    },
    orderBy: {
      startYear: "desc"
    }
  });

  if (!activeSchoolYear) {
    throw notFound("Active school year not found");
  }

  const levels = await prisma.level.findMany({
    select: {
      id: true,
      code: true,
      label: true
    }
  });
  const levelLookup = buildLevelLookupMap(levels);

  let importedFamilies = 0;
  let importedApplications = 0;
  let importedStudents = 0;
  let duplicateRows = 0;
  let invalidRows = parsedImport.invalidRows.length;

  for (const row of parsedImport.rows) {
    const resolvedStudents = row.students.map((student) => {
      const levelId = levelLookup.get(student.requestedLevelKey);

      return {
        ...student,
        levelId: levelId ?? null
      };
    });

    const missingLevelStudent = resolvedStudents.find((student) => student.levelId === null);

    if (missingLevelStudent) {
      invalidRows += 1;
      continue;
    }

    const applicationHash = buildApplicationImportHash(activeSchoolYear.id, row);

    const importResult = await prisma.$transaction(async (tx) => {
      // MVP dedupe rule:
      // - Family is matched by contact email (case-insensitive)
      // - Application is matched by a hash built from school year + contact email
      //   + submittedAt + normalized students identity, which avoids recreating
      //   the same CSV row on repeated imports without adding a heavier history model.
      const existingApplication = await tx.application.findUnique({
        where: {
          rawCsvRowHash: applicationHash
        },
        select: {
          id: true
        }
      });

      if (existingApplication) {
        return {
          createdFamily: false,
          createdApplication: false,
          createdStudents: 0,
          skippedAsDuplicate: true
        };
      }

      const existingFamily = await tx.family.findFirst({
        where: {
          contactEmail: {
            equals: row.family.contactEmail,
            mode: "insensitive"
          }
        },
        select: {
          id: true
        }
      });

      let familyId = existingFamily?.id;
      let createdFamily = false;

      if (existingFamily) {
        await tx.family.update({
          where: {
            id: existingFamily.id
          },
          data: buildFamilyUpdateData(row.family)
        });
      } else {
        const createdFamilyRecord = await tx.family.create({
          data: buildFamilyCreateData(row.family),
          select: {
            id: true
          }
        });

        familyId = createdFamilyRecord.id;
        createdFamily = true;
      }

      if (!familyId) {
        throw new Error("Family creation failed");
      }

      const application = await tx.application.create({
        data: {
          familyId,
          schoolYearId: activeSchoolYear.id,
          submittedAt: row.application.submittedAt,
          declaredChildrenCount: row.application.declaredChildrenCount,
          discoverySource: row.application.discoverySource,
          rawCsvRowHash: applicationHash
        },
        select: {
          id: true
        }
      });

      await tx.student.createMany({
        data: resolvedStudents.map((student) => ({
          applicationId: application.id,
          levelId: student.levelId as string,
          lastName: student.lastName,
          firstName: student.firstName,
          gender: student.gender,
          birthDate: student.birthDate,
          rankInForm: student.rankInForm
        }))
      });

      return {
        createdFamily,
        createdApplication: true,
        createdStudents: resolvedStudents.length,
        skippedAsDuplicate: false
      };
    });

    if (importResult.skippedAsDuplicate) {
      duplicateRows += 1;
      continue;
    }

    if (importResult.createdFamily) {
      importedFamilies += 1;
    }

    if (importResult.createdApplication) {
      importedApplications += 1;
      importedStudents += importResult.createdStudents;
    }
  }

  res.status(200).json({
    importedFamilies,
    importedApplications,
    importedStudents,
    skippedRows: invalidRows + duplicateRows,
    duplicateRows,
    invalidRows,
    totalRows: parsedImport.totalRows,
    activeSchoolYear: activeSchoolYear.label,
    delimiter: parsedImport.detectedDelimiter
  });
};
