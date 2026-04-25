import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { badRequest, notFound } from "../lib/errors";
import { prisma } from "../prisma/client";

const schoolYearSelect = {
  id: true,
  label: true,
  startYear: true,
  endYear: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

const SCHOOL_YEAR_LABEL_PATTERN = /^(\d{4})-(\d{4})$/u;

const getSchoolYearIdFromRequest = (req: Request): string => {
  const schoolYearId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (typeof schoolYearId !== "string" || schoolYearId.trim().length === 0) {
    throw badRequest("School year id is required");
  }

  return schoolYearId;
};

const parseSchoolYearPayload = (
  payload: unknown
): { label: string; startYear: number; endYear: number; isActive: boolean } => {
  const body = (payload ?? {}) as {
    label?: unknown;
    isActive?: unknown;
  };

  if (typeof body.label !== "string" || body.label.trim().length === 0) {
    throw badRequest("School year label is required");
  }

  const normalizedLabel = body.label.trim();
  const labelMatch = normalizedLabel.match(SCHOOL_YEAR_LABEL_PATTERN);

  if (!labelMatch) {
    throw badRequest("Invalid school year label format");
  }

  const startYear = Number.parseInt(labelMatch[1], 10);
  const endYear = Number.parseInt(labelMatch[2], 10);

  if (endYear !== startYear + 1) {
    throw badRequest("Invalid school year label range");
  }

  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    throw badRequest("Invalid school year activation value");
  }

  return {
    label: normalizedLabel,
    startYear,
    endYear,
    isActive: body.isActive ?? false
  };
};

export const getSchoolYears = async (_req: Request, res: Response): Promise<void> => {
  const schoolYears = await prisma.schoolYear.findMany({
    select: schoolYearSelect,
    orderBy: { startYear: "desc" }
  });

  res.status(200).json(schoolYears);
};

export const getActiveSchoolYear = async (_req: Request, res: Response): Promise<void> => {
  const schoolYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
    select: schoolYearSelect,
    orderBy: { startYear: "desc" }
  });

  if (!schoolYear) {
    throw notFound("Active school year not found");
  }

  res.status(200).json(schoolYear);
};

export const createSchoolYear = async (req: Request, res: Response): Promise<void> => {
  const { label, startYear, endYear, isActive } = parseSchoolYearPayload(req.body);

  try {
    const createdSchoolYear = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.schoolYear.updateMany({
          data: { isActive: false }
        });
      }

      return tx.schoolYear.create({
        data: {
          label,
          startYear,
          endYear,
          isActive
        },
        select: schoolYearSelect
      });
    });

    res.status(201).json(createdSchoolYear);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw badRequest("School year label already exists");
    }

    throw error;
  }
};

export const activateSchoolYear = async (req: Request, res: Response): Promise<void> => {
  const schoolYearId = getSchoolYearIdFromRequest(req);

  const existingSchoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: { id: true }
  });

  if (!existingSchoolYear) {
    throw notFound("School year not found");
  }

  const [, activatedSchoolYear] = await prisma.$transaction([
    prisma.schoolYear.updateMany({
      where: {
        id: { not: schoolYearId }
      },
      data: { isActive: false }
    }),
    prisma.schoolYear.update({
      where: { id: schoolYearId },
      data: { isActive: true },
      select: schoolYearSelect
    })
  ]);

  res.status(200).json(activatedSchoolYear);
};

export const deleteSchoolYear = async (req: Request, res: Response): Promise<void> => {
  const schoolYearId = getSchoolYearIdFromRequest(req);

  const schoolYearToDelete = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: {
      id: true,
      label: true,
      isActive: true
    }
  });

  if (!schoolYearToDelete) {
    throw notFound("School year not found");
  }

  const deletionResult = await prisma.$transaction(async (tx) => {
    const linkedApplications = await tx.application.findMany({
      where: { schoolYearId },
      select: { familyId: true }
    });
    const relatedFamilyIds = [...new Set(linkedApplications.map((item) => item.familyId))];
    const replacementSchoolYear = schoolYearToDelete.isActive
      ? await tx.schoolYear.findFirst({
          where: {
            id: { not: schoolYearId }
          },
          orderBy: { startYear: "desc" },
          select: { id: true }
        })
      : null;

    await tx.csvImportLog.deleteMany({
      where: { schoolYearId }
    });

    await tx.application.deleteMany({
      where: { schoolYearId }
    });

    if (relatedFamilyIds.length > 0) {
      const remainingApplications = await tx.application.findMany({
        where: {
          familyId: {
            in: relatedFamilyIds
          }
        },
        select: { familyId: true }
      });
      const remainingFamilyIds = new Set(
        remainingApplications.map((application) => application.familyId)
      );
      const orphanFamilyIds = relatedFamilyIds.filter(
        (familyId) => !remainingFamilyIds.has(familyId)
      );

      if (orphanFamilyIds.length > 0) {
        await tx.family.deleteMany({
          where: {
            id: {
              in: orphanFamilyIds
            }
          }
        });
      }
    }

    await tx.schoolYear.delete({
      where: { id: schoolYearId }
    });

    if (schoolYearToDelete.isActive && replacementSchoolYear) {
      await tx.schoolYear.updateMany({
        where: {
          id: { not: replacementSchoolYear.id }
        },
        data: { isActive: false }
      });

      await tx.schoolYear.update({
        where: { id: replacementSchoolYear.id },
        data: { isActive: true }
      });
    }

    return {
      id: schoolYearToDelete.id,
      activatedSchoolYearId: schoolYearToDelete.isActive
        ? replacementSchoolYear?.id ?? null
        : null
    };
  });

  res.status(200).json(deletionResult);
};
