import { StudentAdmissionStatus, type Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { badRequest, notFound } from "../lib/errors";
import { prisma } from "../prisma/client";

const getQueryParam = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((item): item is string => typeof item === "string");

    return firstValue?.trim() || undefined;
  }

  return undefined;
};

const visibleStatusFilterToDbFilter = (
  status: string
): Prisma.EnumStudentAdmissionStatusFilter<"Student"> => {
  if (status === StudentAdmissionStatus.ACCEPTED) {
    return { equals: StudentAdmissionStatus.ACCEPTED };
  }

  if (status === StudentAdmissionStatus.WAITLISTED) {
    return {
      in: [
        StudentAdmissionStatus.WAITLISTED,
        StudentAdmissionStatus.REFUSED
      ]
    };
  }

  throw badRequest("Invalid student admission status");
};

const getPaginationParam = (
  value: unknown,
  fallback: number,
  maxValue: number
): number => {
  const parsedValue = Number(getQueryParam(value));

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.min(parsedValue, maxValue);
};

const getStudentOrderBy = (
  sortBy: string | undefined,
  sortOrder: string | undefined
): Prisma.StudentOrderByWithRelationInput => {
  const direction = sortOrder === "asc" ? "asc" : "desc";

  if (sortBy === "firstName") {
    return { firstName: direction };
  }

  if (sortBy === "lastName") {
    return { lastName: direction };
  }

  if (sortBy === "level") {
    return { level: { sortOrder: direction } };
  }

  if (sortBy === "birthDate") {
    return { birthDate: direction };
  }

  if (sortBy === "status") {
    return { admissionStatus: direction };
  }

  return { application: { submittedAt: direction } };
};

const studentInclude = {
  level: true,
  application: {
    include: {
      schoolYear: true,
      family: true
    }
  }
} satisfies Prisma.StudentInclude;

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  const search = getQueryParam(req.query.search);
  const status = getQueryParam(req.query.status);
  const levelId = getQueryParam(req.query.levelId);
  const schoolYearId = getQueryParam(req.query.schoolYearId);
  const isPriority = getQueryParam(req.query.isPriority);
  const familyId = getQueryParam(req.query.familyId);
  const sortBy = getQueryParam(req.query.sortBy);
  const sortOrder = getQueryParam(req.query.sortOrder);
  const page = getPaginationParam(req.query.page, 1, 100000);
  const limit = getPaginationParam(req.query.limit, 20, 5000);
  const where: Prisma.StudentWhereInput = {};

  if (status) {
    where.admissionStatus = visibleStatusFilterToDbFilter(status);
  }

  if (levelId) {
    where.levelId = levelId;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      {
        application: {
          family: {
            fatherLastName: { contains: search, mode: "insensitive" }
          }
        }
      },
      {
        application: {
          family: {
            fatherFirstName: { contains: search, mode: "insensitive" }
          }
        }
      },
      {
        application: {
          family: {
            motherLastName: { contains: search, mode: "insensitive" }
          }
        }
      },
      {
        application: {
          family: {
            motherFirstName: { contains: search, mode: "insensitive" }
          }
        }
      },
      {
        application: {
          family: {
            contactEmail: { contains: search, mode: "insensitive" }
          }
        }
      },
      {
        application: {
          family: {
            contactPhone: { contains: search, mode: "insensitive" }
          }
        }
      }
    ];
  }

  const applicationWhere: Prisma.ApplicationWhereInput = {};

  if (schoolYearId) {
    applicationWhere.schoolYearId = schoolYearId;
  }

  if (familyId) {
    applicationWhere.familyId = familyId;
  }

  if (isPriority) {
    if (isPriority !== "true" && isPriority !== "false") {
      throw badRequest("Invalid priority filter");
    }

    where.isPriority = isPriority === "true";
  }

  if (Object.keys(applicationWhere).length > 0) {
    where.application = applicationWhere;
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: studentInclude,
      orderBy: getStudentOrderBy(sortBy, sortOrder),
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.status(200).json({
    data: students,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
};

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: studentInclude
  });

  if (!student) {
    throw notFound("Student not found");
  }

  res.status(200).json(student);
};

export const updateStudentPriority = async (
  req: Request,
  res: Response
): Promise<void> => {
  const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const isPriority = req.body?.isPriority;

  if (typeof isPriority !== "boolean") {
    throw badRequest("Invalid priority value");
  }

  const existingStudent = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true }
  });

  if (!existingStudent) {
    throw notFound("Student not found");
  }

  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: { isPriority },
    include: studentInclude
  });

  res.status(200).json(updatedStudent);
};
