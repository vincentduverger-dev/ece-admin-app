import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { buildApplicationImportHash, normalizeLevelLookupKey, parseCsvImportFile } from "../lib/csv-import";
import { badRequest, notFound } from "../lib/errors";
import { prisma } from "../prisma/client";

const csvImportLogSelect = {
  id: true,
  fileName: true,
  importedFamilies: true,
  importedApplications: true,
  importedStudents: true,
  skippedRows: true,
  duplicateRows: true,
  invalidRows: true,
  totalRows: true,
  status: true,
  createdAt: true,
  schoolYear: {
    select: {
      id: true,
      label: true
    }
  }
} satisfies Prisma.CsvImportLogSelect;

type CsvImportLogResponse = Prisma.CsvImportLogGetPayload<{
  select: typeof csvImportLogSelect;
}>;

const ACCEPTED_CSV_MIME_TYPES = new Set([
  "application/csv",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain"
]);

const IMPORT_LEVEL_DEFINITIONS = new Map([
  ["ps", { code: "PS", label: "Petite Section", sortOrder: 1, availablePlaces: 18 }],
  ["ms", { code: "MS", label: "Moyenne Section", sortOrder: 2, availablePlaces: 18 }],
  ["gs", { code: "GS", label: "Grande Section", sortOrder: 3, availablePlaces: 18 }],
  ["cp", { code: "CP", label: "CP", sortOrder: 4, availablePlaces: 22 }],
  ["ce1", { code: "CE1", label: "CE1", sortOrder: 5, availablePlaces: 22 }],
  ["ce2", { code: "CE2", label: "CE2", sortOrder: 6, availablePlaces: 22 }],
  ["cm1", { code: "CM1", label: "CM1", sortOrder: 7, availablePlaces: 24 }],
  ["cm2", { code: "CM2", label: "CM2", sortOrder: 8, availablePlaces: 24 }],
  ["6e", { code: "6E", label: "6e", sortOrder: 9, availablePlaces: 0 }],
  ["5e", { code: "5E", label: "5e", sortOrder: 10, availablePlaces: 0 }],
  ["4e", { code: "4E", label: "4e", sortOrder: 11, availablePlaces: 0 }],
  ["3e", { code: "3E", label: "3e", sortOrder: 12, availablePlaces: 0 }],
  ["seconde", { code: "SECONDE", label: "Seconde", sortOrder: 13, availablePlaces: 0 }],
  ["premiere", { code: "PREMIERE", label: "Première", sortOrder: 14, availablePlaces: 0 }],
  ["terminale", { code: "TERMINALE", label: "Terminale", sortOrder: 15, availablePlaces: 0 }]
]);

const normalizeUploadedFileName = (fileName: string): string => {
  const trimmedFileName = fileName.trim();

  if (trimmedFileName.length === 0) {
    return trimmedFileName;
  }

  if (!/[ÃÂâ]/u.test(trimmedFileName)) {
    return trimmedFileName;
  }

  const decodedFileName = Buffer.from(trimmedFileName, "latin1").toString("utf8").trim();

  return decodedFileName.length > 0 ? decodedFileName : trimmedFileName;
};

const sanitizeLevelCode = (value: string): string => {
  const normalizedValue = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, "");

  return normalizedValue.length > 0 ? normalizedValue.slice(0, 32) : "LEVEL";
};

const buildMissingLevelDefinitions = (
  rows: Array<{
    students: Array<{
      requestedLevelKey: string;
      requestedLevelLabel: string;
    }>;
  }>,
  existingLevels: Array<{ code: string; sortOrder: number }>
): Array<{
  code: string;
  label: string;
  sortOrder: number;
  availablePlaces: number;
}> => {
  const existingLevelKeys = new Set(
    existingLevels.map((level) => normalizeLevelLookupKey(level.code))
  );
  const usedCodes = new Set(existingLevels.map((level) => level.code.toUpperCase()));
  const missingLevels = new Map<
    string,
    {
      code: string;
      label: string;
      sortOrder: number;
      availablePlaces: number;
    }
  >();
  let nextFallbackSortOrder = Math.max(
    100,
    ...existingLevels.map((level) => level.sortOrder + 1),
    ...Array.from(IMPORT_LEVEL_DEFINITIONS.values()).map((level) => level.sortOrder + 1)
  );

  for (const row of rows) {
    for (const student of row.students) {
      if (
        existingLevelKeys.has(student.requestedLevelKey) ||
        missingLevels.has(student.requestedLevelKey)
      ) {
        continue;
      }

      const predefinedLevel = IMPORT_LEVEL_DEFINITIONS.get(student.requestedLevelKey);

      if (predefinedLevel) {
        missingLevels.set(student.requestedLevelKey, predefinedLevel);
        usedCodes.add(predefinedLevel.code.toUpperCase());
        continue;
      }

      let fallbackCode = sanitizeLevelCode(student.requestedLevelLabel);

      while (usedCodes.has(fallbackCode)) {
        fallbackCode = `${fallbackCode}X`;
      }

      usedCodes.add(fallbackCode);
      missingLevels.set(student.requestedLevelKey, {
        code: fallbackCode,
        label: student.requestedLevelLabel.trim(),
        sortOrder: nextFallbackSortOrder,
        availablePlaces: 0
      });
      nextFallbackSortOrder += 1;
    }
  }

  return Array.from(missingLevels.values());
};

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

const mapCsvImportLog = (log: CsvImportLogResponse) => {
  return {
    id: log.id,
    fileName: log.fileName,
    importedFamilies: log.importedFamilies,
    importedApplications: log.importedApplications,
    importedStudents: log.importedStudents,
    skippedRows: log.skippedRows,
    duplicateRows: log.duplicateRows,
    invalidRows: log.invalidRows,
    totalRows: log.totalRows,
    status: log.status,
    createdAt: log.createdAt,
    schoolYearId: log.schoolYear?.id ?? null,
    schoolYearLabel: log.schoolYear?.label ?? null
  };
};

export const getCsvImportHistory = async (_req: Request, res: Response): Promise<void> => {
  const importLogs = await prisma.csvImportLog.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: 50,
    select: csvImportLogSelect
  });

  res.status(200).json(importLogs.map(mapCsvImportLog));
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
  const normalizedFileName = normalizeUploadedFileName(file.originalname);
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
      label: true,
      sortOrder: true
    }
  });
  const missingLevels = buildMissingLevelDefinitions(parsedImport.rows, levels);

  if (missingLevels.length > 0) {
    await prisma.level.createMany({
      data: missingLevels,
      skipDuplicates: true
    });
  }

  const allLevels = missingLevels.length > 0
    ? await prisma.level.findMany({
      select: {
        id: true,
        code: true,
        label: true,
        sortOrder: true
      }
    })
    : levels;
  const levelLookup = buildLevelLookupMap(allLevels);

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

  const createdImportLog = await prisma.csvImportLog.create({
    data: {
      schoolYearId: activeSchoolYear.id,
      fileName: normalizedFileName.length > 0 ? normalizedFileName : null,
      importedFamilies,
      importedApplications,
      importedStudents,
      skippedRows: invalidRows + duplicateRows,
      duplicateRows,
      invalidRows,
      totalRows: parsedImport.totalRows
    },
    select: csvImportLogSelect
  });

  res.status(200).json({
    importedFamilies,
    importedApplications,
    importedStudents,
    skippedRows: invalidRows + duplicateRows,
    duplicateRows,
    invalidRows,
    totalRows: parsedImport.totalRows,
    activeSchoolYear: activeSchoolYear.label,
    delimiter: parsedImport.detectedDelimiter,
    historyEntry: mapCsvImportLog(createdImportLog)
  });
};
