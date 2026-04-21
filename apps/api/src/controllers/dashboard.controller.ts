import { ApplicationStatus } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../prisma/client";

type DashboardStatusCounts = {
  RECEIVED: number;
  IN_REVIEW: number;
  ACCEPTED: number;
  REFUSED: number;
};

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  const [totalApplications, statusCounts, levels, priorityApplications] = await Promise.all([
    prisma.application.count(),
    prisma.application.groupBy({
      by: ["status"],
      _count: {
        _all: true
      }
    }),
    prisma.level.findMany({
      select: {
        code: true,
        label: true,
        sortOrder: true,
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: {
        sortOrder: "asc"
      }
    }),
    prisma.application.findMany({
      where: {
        isPriority: true
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        status: true,
        isPriority: true,
        createdAt: true,
        family: {
          select: {
            contactEmail: true,
            fatherLastName: true,
            motherLastName: true
          }
        },
        schoolYear: {
          select: {
            label: true,
            isActive: true
          }
        },
        students: {
          select: {
            firstName: true,
            lastName: true,
            level: {
              select: {
                code: true,
                label: true
              }
            }
          }
        }
      }
    })
  ]);

  const byStatus: DashboardStatusCounts = {
    [ApplicationStatus.RECEIVED]: 0,
    [ApplicationStatus.IN_REVIEW]: 0,
    [ApplicationStatus.ACCEPTED]: 0,
    [ApplicationStatus.REFUSED]: 0
  };

  for (const statusCount of statusCounts) {
    byStatus[statusCount.status] = statusCount._count._all;
  }

  const byLevel = levels.map((level) => ({
    code: level.code,
    label: level.label,
    count: level._count.students
  }));

  res.status(200).json({
    totalApplications,
    byStatus,
    byLevel,
    priorityApplications
  });
};
