import type { Request, Response } from "express";

import { prisma } from "../prisma/client";

export const getSchoolYears = async (_req: Request, res: Response): Promise<void> => {
  try {
    const schoolYears = await prisma.schoolYear.findMany({
      select: {
        id: true,
        label: true,
        startYear: true,
        endYear: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { startYear: "desc" }
    });

    res.status(200).json(schoolYears);
  } catch (error) {
    console.error("Failed to fetch school years:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getActiveSchoolYear = async (_req: Request, res: Response): Promise<void> => {
  try {
    const schoolYear = await prisma.schoolYear.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        label: true,
        startYear: true,
        endYear: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { startYear: "desc" }
    });

    if (!schoolYear) {
      res.status(404).json({ message: "Active school year not found" });
      return;
    }

    res.status(200).json(schoolYear);
  } catch (error) {
    console.error("Failed to fetch active school year:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const activateSchoolYear = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolYearId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existingSchoolYear = await prisma.schoolYear.findUnique({
      where: { id: schoolYearId },
      select: { id: true }
    });

    if (!existingSchoolYear) {
      res.status(404).json({ message: "School year not found" });
      return;
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
        select: {
          id: true,
          label: true,
          startYear: true,
          endYear: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    res.status(200).json(activatedSchoolYear);
  } catch (error) {
    console.error("Failed to activate school year:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
