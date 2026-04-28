import {
  ApplicationStatus,
  EmailSendStatus,
  EmailType,
  type Prisma
} from "@prisma/client";
import type { Request, Response } from "express";

import { badRequest, notFound } from "../lib/errors";
import { prisma } from "../prisma/client";

const getQueryParam = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }

  if (Array.isArray(value)) {
    const firstStringValue = value.find((item): item is string => typeof item === "string");

    if (!firstStringValue) {
      return undefined;
    }

    const trimmedValue = firstStringValue.trim();

    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }

  return undefined;
};

const isApplicationStatus = (value: string): value is ApplicationStatus => {
  return Object.values(ApplicationStatus).includes(value as ApplicationStatus);
};

type StudentAdmissionStatus = "PENDING" | "ACCEPTED" | "REFUSED" | "WAITLISTED";
const studentAdmissionStatuses: StudentAdmissionStatus[] = [
  "PENDING",
  "ACCEPTED",
  "REFUSED",
  "WAITLISTED"
];

const isStudentAdmissionStatus = (value: string): value is StudentAdmissionStatus => {
  return studentAdmissionStatuses.includes(value as StudentAdmissionStatus);
};

type ApplicationDecisionStatus = "ACCEPTED" | "WAITLISTED";
type ApplicationEmailType =
  | "ACCEPTANCE"
  | "REFUSAL"
  | "WAITLIST"
  | "PARTIAL_DECISION"
  | "CUSTOM";

const isApplicationDecisionStatus = (
  value: string
): value is ApplicationDecisionStatus => {
  return value === "ACCEPTED" || value === "WAITLISTED";
};

const isApplicationEmailType = (value: string): value is ApplicationEmailType => {
  return (
    value === EmailType.ACCEPTANCE ||
    value === EmailType.REFUSAL ||
    value === EmailType.WAITLIST ||
    value === EmailType.PARTIAL_DECISION ||
    value === EmailType.CUSTOM
  );
};

const getRecalculatedApplicationStatus = (
  currentStatus: ApplicationStatus,
  students: Array<{ admissionStatus: StudentAdmissionStatus }>
): ApplicationStatus => {
  if (students.length === 0) {
    return currentStatus;
  }

  const allPending = students.every(
    (student) => student.admissionStatus === "PENDING"
  );

  if (allPending) {
    return currentStatus === ApplicationStatus.RECEIVED ||
      currentStatus === ApplicationStatus.IN_REVIEW
      ? currentStatus
      : ApplicationStatus.IN_REVIEW;
  }

  const allAccepted = students.every(
    (student) => student.admissionStatus === "ACCEPTED"
  );

  if (allAccepted) {
    return ApplicationStatus.ACCEPTED;
  }

  const allWaitlisted = students.every(
    (student) =>
      student.admissionStatus === "WAITLISTED" ||
      student.admissionStatus === "REFUSED"
  );

  if (allWaitlisted) {
    return ApplicationStatus.WAITLISTED;
  }

  const hasAccepted = students.some(
    (student) => student.admissionStatus === "ACCEPTED"
  );
  const hasWaitlisted = students.some(
    (student) =>
      student.admissionStatus === "WAITLISTED" ||
      student.admissionStatus === "REFUSED"
  );
  const hasPending = students.some(
    (student) => student.admissionStatus === "PENDING"
  );

  if (hasAccepted && hasWaitlisted) {
    return ApplicationStatus.PARTIALLY_ACCEPTED;
  }

  if (hasAccepted || hasWaitlisted || hasPending) {
    return ApplicationStatus.IN_REVIEW;
  }

  return ApplicationStatus.IN_REVIEW;
};

export const getApplications = async (req: Request, res: Response): Promise<void> => {
  const status = getQueryParam(req.query.status);
  const schoolYearId = getQueryParam(req.query.schoolYearId);
  const isPriority = getQueryParam(req.query.isPriority);
  const search = getQueryParam(req.query.search);
  const where: Prisma.ApplicationWhereInput = {};

  if (status) {
    if (!isApplicationStatus(status)) {
      throw badRequest("Invalid application status");
    }

    if (status === ApplicationStatus.WAITLISTED) {
      where.status = {
        in: [ApplicationStatus.WAITLISTED, ApplicationStatus.REFUSED]
      };
    } else {
      where.status = status;
    }
  }

  if (schoolYearId) {
    where.schoolYearId = schoolYearId;
  }

  if (isPriority) {
    if (isPriority !== "true" && isPriority !== "false") {
      throw badRequest("Invalid priority filter");
    }

    where.isPriority = isPriority === "true";
  }

  if (search) {
    where.OR = [
      {
        family: {
          is: {
            contactEmail: {
              contains: search,
              mode: "insensitive"
            }
          }
        }
      },
      {
        family: {
          is: {
            fatherLastName: {
              contains: search,
              mode: "insensitive"
            }
          }
        }
      },
      {
        family: {
          is: {
            motherLastName: {
              contains: search,
              mode: "insensitive"
            }
          }
        }
      },
      {
        students: {
          some: {
            firstName: {
              contains: search,
              mode: "insensitive"
            }
          }
        }
      },
      {
        students: {
          some: {
            lastName: {
              contains: search,
              mode: "insensitive"
            }
          }
        }
      }
    ];
  }

  const applications = await prisma.application.findMany({
    where,
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
};

export const getApplicationById = async (req: Request, res: Response): Promise<void> => {
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
    throw notFound("Application not found");
  }

  res.status(200).json(application);
};

export const getApplicationEmailLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const existingApplication = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true }
  });

  if (!existingApplication) {
    throw notFound("Application not found");
  }

  const emailLogs = await prisma.applicationEmailLog.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json(emailLogs);
};

export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const status = getQueryParam(req.body?.status);

  if (!status || !isApplicationStatus(status)) {
    throw badRequest("Invalid application status");
  }

  const existingApplication = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true }
  });

  if (!existingApplication) {
    throw notFound("Application not found");
  }

  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: { status }
  });

  res.status(200).json(updatedApplication);
};

export const updateApplicationPriority = async (req: Request, res: Response): Promise<void> => {
  const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const isPriority = req.body?.isPriority;

  if (typeof isPriority !== "boolean") {
    throw badRequest("Invalid priority value");
  }

  const existingApplication = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true }
  });

  if (!existingApplication) {
    throw notFound("Application not found");
  }

  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: { isPriority }
  });

  res.status(200).json(updatedApplication);
};

export const updateApplicationDecision = async (req: Request, res: Response): Promise<void> => {
  const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const status = getQueryParam(req.body?.status);
  const decisionNote = typeof req.body?.decisionNote === "string" ? req.body.decisionNote : null;

  if (!status || !isApplicationDecisionStatus(status)) {
    throw badRequest("Invalid application decision status");
  }

  const existingApplication = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true }
  });

  if (!existingApplication) {
    throw notFound("Application not found");
  }

  const updatedApplication = await prisma.$transaction(async (transaction) => {
    await transaction.student.updateMany({
      where: { applicationId },
    data: { admissionStatus: status }
    });

    return transaction.application.update({
      where: { id: applicationId },
      data: {
        status,
        decisionAt: new Date(),
        decisionNote
      }
    });
  });

  res.status(200).json(updatedApplication);
};

export const updateStudentAdmissionStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const admissionStatus = getQueryParam(req.body?.admissionStatus);

  if (!admissionStatus || !isStudentAdmissionStatus(admissionStatus)) {
    throw badRequest("Invalid student admission status");
  }

  const updateResult = await prisma.$transaction(async (transaction) => {
    const existingStudent = await transaction.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        applicationId: true,
        application: {
          select: {
            status: true
          }
        }
      }
    });

    if (!existingStudent) {
      throw notFound("Student not found");
    }

    const updatedStudent = await transaction.student.update({
      where: { id: studentId },
      data: { admissionStatus },
      include: {
        level: true
      }
    });

    const applicationStudents = await transaction.student.findMany({
      where: { applicationId: existingStudent.applicationId },
      select: { admissionStatus: true }
    });
    const recalculatedStatus = getRecalculatedApplicationStatus(
      existingStudent.application.status,
      applicationStudents
    );
    const updatedApplication = await transaction.application.update({
      where: { id: existingStudent.applicationId },
      data: { status: recalculatedStatus },
      select: {
        id: true,
        status: true
      }
    });

    return {
      student: updatedStudent,
      applicationStatus: updatedApplication.status
    };
  });

  res.status(200).json(updateResult);
};

export const sendApplicationEmail = async (req: Request, res: Response): Promise<void> => {
  const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const emailType = getQueryParam(req.body?.emailType);
  const subject = getQueryParam(req.body?.subject);
  const body = getQueryParam(req.body?.body);

  if (!emailType || !isApplicationEmailType(emailType)) {
    throw badRequest("Invalid email type");
  }

  if (!subject || !body) {
    throw badRequest("Invalid email payload");
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      family: true
    }
  });

  if (!application) {
    throw notFound("Application not found");
  }

  const recipientEmail = application.family.contactEmail.trim();

  if (!recipientEmail) {
    throw badRequest("Missing recipient email");
  }

  const emailLog = await prisma.applicationEmailLog.create({
    data: {
      applicationId: application.id,
      emailType,
      recipientEmail,
      subject,
      bodySnapshot: body,
      sentAt: new Date(),
      sendStatus: EmailSendStatus.SENT
    }
  });

  res.status(201).json(emailLog);
};
