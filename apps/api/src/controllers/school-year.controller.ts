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
