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

export const getApplicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        family: true,
        schoolYear: true,
        students: {
          include: {
            level: true
          }
        },
        emailLogs: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    res.status(200).json(application);
  } catch (error) {
    console.error("Failed to fetch application:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
