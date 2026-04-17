import type { Request, Response } from "express";

import { prisma } from "../prisma/client";

export const getApplications = async (_req: Request, res: Response): Promise<void> => {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        family: true,
        schoolYear: true,
        students: {
          include: {
            level: true
          }
        }
      }
    });

    res.status(200).json(applications);
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
