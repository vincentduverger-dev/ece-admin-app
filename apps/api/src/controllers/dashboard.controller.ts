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
  const activeSchoolYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { startYear: "desc" }
  });

  if (!activeSchoolYear) {
    const levels = await prisma.level.findMany({
      select: {
        code: true,
        label: true,
        sortOrder: true
      },
      orderBy: {
        sortOrder: "asc"
      }
    });

    res.status(200).json({
      totalApplications: 0,
      byStatus: {
        [ApplicationStatus.RECEIVED]: 0,
        [ApplicationStatus.IN_REVIEW]: 0,
        [ApplicationStatus.ACCEPTED]: 0,
        [ApplicationStatus.REFUSED]: 0
      },
      byLevel: levels.map((level) => ({
        code: level.code,
        label: level.label,
        count: 0
      })),
      priorityApplications: []
    });
    return;
  }

  const [totalApplications, statusCounts, levels, studentCountsByLevel, priorityApplications] = await Promise.all([
    prisma.application.count({
      where: {
        schoolYearId: activeSchoolYear.id
      }
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: {
        schoolYearId: activeSchoolYear.id
      },
      _count: {
        _all: true
      }
    }),
    prisma.level.findMany({
      select: {
        id: true,
        code: true,
        label: true,
        sortOrder: true
      },
      orderBy: {
        sortOrder: "asc"
      }
    }),
    prisma.student.groupBy({
      by: ["levelId"],
      where: {
        application: {
          schoolYearId: activeSchoolYear.id
        }
      },
      _count: {
        _all: true
      }
    }),
    prisma.application.findMany({
      where: {
        isPriority: true,
        schoolYearId: activeSchoolYear.id
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

  const studentCountsByLevelId = new Map(
    studentCountsByLevel.map((level) => [level.levelId, level._count._all])
  );

  const byLevel = levels.map((level) => ({
    code: level.code,
    label: level.label,
    count: studentCountsByLevelId.get(level.id) ?? 0
  }));

  res.status(200).json({
    totalApplications,
    byStatus,
    byLevel,
    priorityApplications
  });
};
