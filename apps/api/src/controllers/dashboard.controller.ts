import { ApplicationStatus, StudentAdmissionStatus } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../prisma/client";

type DashboardStatusCounts = {
  RECEIVED: number;
  IN_REVIEW: number;
  ACCEPTED: number;
  REFUSED: number;
  WAITLISTED: number;
  PARTIALLY_ACCEPTED: number;
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
      waitlistedStudents: 0,
      byStatus: {
        [ApplicationStatus.RECEIVED]: 0,
        [ApplicationStatus.IN_REVIEW]: 0,
        [ApplicationStatus.ACCEPTED]: 0,
        [ApplicationStatus.REFUSED]: 0,
        [ApplicationStatus.WAITLISTED]: 0,
        [ApplicationStatus.PARTIALLY_ACCEPTED]: 0
      },
      byLevel: levels.map((level) => ({
        id: undefined,
        code: level.code,
        label: level.label,
        count: 0,
        requestedStudentsCount: 0,
        acceptedStudentsCount: 0,
        availablePlaces: 0,
        isCapacityConfigured: false,
        remainingPlaces: 0
      })),
      priorityApplications: [],
      studentStats: {
        totalStudents: 0,
        acceptedStudents: 0,
        waitlistedStudents: 0,
        byLevel: levels.map((level) => ({
          id: undefined,
          code: level.code,
          label: level.label,
          count: 0,
          requestedStudentsCount: 0,
          acceptedStudentsCount: 0,
          availablePlaces: 0,
          isCapacityConfigured: false,
          remainingPlaces: 0
        })),
        priorityStudents: []
      }
    });
    return;
  }

  const [
    totalApplications,
    totalStudents,
    acceptedStudents,
    waitlistedStudents,
    statusCounts,
    levels,
    studentCountsByLevel,
    acceptedStudentCountsByLevel,
    levelCapacities,
    priorityApplications
  ] = await Promise.all([
    prisma.application.count({
      where: {
        schoolYearId: activeSchoolYear.id
      }
    }),
    prisma.student.count({
      where: {
        application: {
          schoolYearId: activeSchoolYear.id
        }
      }
    }),
    prisma.student.count({
      where: {
        admissionStatus: StudentAdmissionStatus.ACCEPTED,
        application: {
          schoolYearId: activeSchoolYear.id
        }
      }
    }),
    prisma.student.count({
      where: {
        admissionStatus: {
          in: [
            StudentAdmissionStatus.WAITLISTED,
            StudentAdmissionStatus.REFUSED
          ]
        },
        application: {
          schoolYearId: activeSchoolYear.id
        }
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
        sortOrder: true,
        availablePlaces: true
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
    prisma.student.groupBy({
      by: ["levelId"],
      where: {
        admissionStatus: StudentAdmissionStatus.ACCEPTED,
        application: {
          schoolYearId: activeSchoolYear.id
        }
      },
      _count: {
        _all: true
      }
    }),
    prisma.levelCapacity.findMany({
      where: {
        schoolYearId: activeSchoolYear.id
      },
      select: {
        levelId: true,
        availablePlaces: true
      }
    }),
    prisma.application.findMany({
      where: {
        schoolYearId: activeSchoolYear.id,
        students: {
          some: {
            isPriority: true
          }
        }
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
          where: {
            isPriority: true
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionStatus: true,
            isPriority: true,
            level: {
              select: {
                id: true,
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
    [ApplicationStatus.REFUSED]: 0,
    [ApplicationStatus.WAITLISTED]: 0,
    [ApplicationStatus.PARTIALLY_ACCEPTED]: 0
  };

  for (const statusCount of statusCounts) {
    const dashboardStatus =
      statusCount.status === ApplicationStatus.REFUSED
        ? ApplicationStatus.WAITLISTED
        : statusCount.status === ApplicationStatus.RECEIVED
        ? ApplicationStatus.IN_REVIEW
        : statusCount.status;

    byStatus[dashboardStatus] += statusCount._count._all;
  }

  const studentCountsByLevelId = new Map(
    studentCountsByLevel.map((level) => [level.levelId, level._count._all])
  );
  const acceptedStudentCountsByLevelId = new Map(
    acceptedStudentCountsByLevel.map((level) => [level.levelId, level._count._all])
  );
  const levelCapacityByLevelId = new Map(
    levelCapacities.map((capacity) => [capacity.levelId, capacity.availablePlaces])
  );
  const configuredLevelCapacityIds = new Set(
    levelCapacities.map((capacity) => capacity.levelId)
  );

  const byLevel = levels.map((level) => {
    const requestedStudentsCount = studentCountsByLevelId.get(level.id) ?? 0;
    const acceptedStudentsCount = acceptedStudentCountsByLevelId.get(level.id) ?? 0;
    const availablePlaces = levelCapacityByLevelId.get(level.id) ?? 0;
    const isCapacityConfigured = configuredLevelCapacityIds.has(level.id);

    return {
      id: level.id,
      code: level.code,
      label: level.label,
      count: requestedStudentsCount,
      requestedStudentsCount,
      acceptedStudentsCount,
      availablePlaces,
      isCapacityConfigured,
      remainingPlaces: availablePlaces - acceptedStudentsCount
    };
  });

  const priorityStudents = priorityApplications.flatMap((application) =>
    application.students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      admissionStatus:
        student.admissionStatus === StudentAdmissionStatus.ACCEPTED
          ? StudentAdmissionStatus.ACCEPTED
          : student.admissionStatus === StudentAdmissionStatus.WAITLISTED ||
            student.admissionStatus === StudentAdmissionStatus.REFUSED
          ? StudentAdmissionStatus.WAITLISTED
          : StudentAdmissionStatus.PENDING,
      level: student.level,
      application: {
        id: application.id,
        isPriority: student.isPriority,
        createdAt: application.createdAt,
        schoolYear: application.schoolYear,
        family: application.family
      }
    }))
  );

  res.status(200).json({
    totalApplications,
    waitlistedStudents,
    byStatus,
    byLevel,
    priorityApplications,
    studentStats: {
      totalStudents,
      acceptedStudents,
      waitlistedStudents,
      byLevel,
      priorityStudents
    }
  });
};
