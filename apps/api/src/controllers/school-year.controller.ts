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
  const schoolYearId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

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
