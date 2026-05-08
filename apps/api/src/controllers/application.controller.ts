import {
  ApplicationStatus,
  EmailSendStatus,
  EmailType,
  StudentAdmissionStatus,
  type Prisma
} from "@prisma/client";
import type { Request, Response } from "express";

import { badRequest, notFound } from "../lib/errors";
import { prisma } from "../prisma/client";
import { sendApplicationMail } from "../services/mailer.service";

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

const getBooleanPayloadParam = (value: unknown): boolean => {
  return value === true || value === "true";
};

const isApplicationStatus = (value: string): value is ApplicationStatus => {
  return Object.values(ApplicationStatus).includes(value as ApplicationStatus);
};

const visibleStudentAdmissionStatuses: StudentAdmissionStatus[] = [
  StudentAdmissionStatus.PENDING,
  StudentAdmissionStatus.ACCEPTED,
  StudentAdmissionStatus.WAITLISTED
];

const isStudentAdmissionStatus = (value: string): value is StudentAdmissionStatus => {
  return visibleStudentAdmissionStatuses.includes(value as StudentAdmissionStatus);
};

type ApplicationDecisionStatus = "ACCEPTED" | "WAITLISTED";
type ApplicationEmailType =
  | "ACCEPTANCE"
  | "WAITLIST"
  | "PARTIAL_DECISION"
  | "CUSTOM";
type ReadyApplicationEmailType = Exclude<ApplicationEmailType, "CUSTOM">;

const isApplicationDecisionStatus = (
  value: string
): value is ApplicationDecisionStatus => {
  return value === "ACCEPTED" || value === "WAITLISTED";
};

const isApplicationEmailType = (value: string): value is ApplicationEmailType => {
  return (
    value === EmailType.ACCEPTANCE ||
    value === EmailType.WAITLIST ||
    value === EmailType.PARTIAL_DECISION ||
    value === EmailType.CUSTOM
  );
};

const isValidEmailAddress = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const requiredStatusByEmailType: Partial<
  Record<ApplicationEmailType, ApplicationStatus>
> = {
  ACCEPTANCE: ApplicationStatus.ACCEPTED,
  WAITLIST: ApplicationStatus.WAITLISTED,
  PARTIAL_DECISION: ApplicationStatus.PARTIALLY_ACCEPTED
};

const getEmailTypeMismatchMessage = (
  emailType: ApplicationEmailType,
  applicationStatus: ApplicationStatus
): string | null => {
  const requiredStatus = requiredStatusByEmailType[emailType];

  if (!requiredStatus || applicationStatus === requiredStatus) {
    return null;
  }

  if (emailType === "ACCEPTANCE") {
    return "Le type d'email Acceptation est autorisé uniquement pour une demande acceptée.";
  }

  if (emailType === "WAITLIST") {
    return "Le type d'email Liste d'attente est autorisé uniquement pour une demande en liste d'attente.";
  }

  return "Le type d'email Décision partielle est autorisé uniquement pour une demande en décision partielle.";
};

const getDecisionStatusFromEmailType = (
  emailType: ApplicationEmailType
): ApplicationStatus | null => {
  if (emailType === "ACCEPTANCE") {
    return ApplicationStatus.ACCEPTED;
  }

  if (emailType === "WAITLIST") {
    return ApplicationStatus.WAITLISTED;
  }

  if (emailType === "PARTIAL_DECISION") {
    return ApplicationStatus.PARTIALLY_ACCEPTED;
  }

  return null;
};

const getRecommendedEmailTypeFromStudents = (
  students: Array<{ admissionStatus: StudentAdmissionStatus }>
): ReadyApplicationEmailType | null => {
  if (students.length === 0) {
    return null;
  }

  const allAccepted = students.every(
    (student) => student.admissionStatus === StudentAdmissionStatus.ACCEPTED
  );

  if (allAccepted) {
    return EmailType.ACCEPTANCE;
  }

  const allWaitlisted = students.every(
    (student) => student.admissionStatus === StudentAdmissionStatus.WAITLISTED
  );

  if (allWaitlisted) {
    return EmailType.WAITLIST;
  }

  const allReady = students.every(
    (student) =>
      student.admissionStatus === StudentAdmissionStatus.ACCEPTED ||
      student.admissionStatus === StudentAdmissionStatus.WAITLISTED
  );

  return allReady ? EmailType.PARTIAL_DECISION : null;
};

const decisionEmailTypes = [
  EmailType.ACCEPTANCE,
  EmailType.WAITLIST,
  EmailType.PARTIAL_DECISION
] as const;

const getRecalculatedApplicationStatus = (
  currentStatus: ApplicationStatus,
  students: Array<{ admissionStatus: StudentAdmissionStatus }>
): ApplicationStatus => {
  if (students.length === 0) {
    return currentStatus;
  }

  const allAccepted = students.every(
    (student) => student.admissionStatus === StudentAdmissionStatus.ACCEPTED
  );

  if (allAccepted) {
    return ApplicationStatus.ACCEPTED;
  }

  const allWaitlisted = students.every(
    (student) =>
      student.admissionStatus === StudentAdmissionStatus.WAITLISTED ||
      student.admissionStatus === StudentAdmissionStatus.REFUSED
  );

  if (allWaitlisted) {
    return ApplicationStatus.WAITLISTED;
  }

  const hasAccepted = students.some(
    (student) => student.admissionStatus === StudentAdmissionStatus.ACCEPTED
  );
  const hasWaitlisted = students.some(
    (student) =>
      student.admissionStatus === StudentAdmissionStatus.WAITLISTED ||
      student.admissionStatus === StudentAdmissionStatus.REFUSED
  );
  const hasPending = students.some(
    (student) => student.admissionStatus === StudentAdmissionStatus.PENDING
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
    } else if (status === ApplicationStatus.IN_REVIEW) {
      where.status = {
        in: [ApplicationStatus.IN_REVIEW, ApplicationStatus.RECEIVED]
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

export const getApplicationsReadyForEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const requestedSchoolYearId = getQueryParam(req.query.schoolYearId);
  const activeSchoolYear = requestedSchoolYearId
    ? null
    : await prisma.schoolYear.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { startYear: "desc" }
      });
  const schoolYearId = requestedSchoolYearId ?? activeSchoolYear?.id;

  if (!schoolYearId) {
    res.status(200).json([]);
    return;
  }

  const applications = await prisma.application.findMany({
    where: {
      schoolYearId,
      students: {
        some: {},
        every: {
          admissionStatus: {
            in: [StudentAdmissionStatus.ACCEPTED, StudentAdmissionStatus.WAITLISTED]
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    include: {
      family: true,
      students: {
        orderBy: [{ rankInForm: "asc" }, { createdAt: "asc" }],
        include: {
          level: true
        }
      },
      emailLogs: {
        where: {
          sendStatus: EmailSendStatus.SENT,
          emailType: {
            in: [...decisionEmailTypes]
          }
        },
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  res.status(200).json(
    applications
      .map((application) => {
        const recommendedEmailType = getRecommendedEmailTypeFromStudents(
          application.students
        );

        if (!recommendedEmailType) {
          return null;
        }

        const lastSentEmailLog = application.emailLogs[0] ?? null;

        return {
          id: application.id,
          status: application.status,
          decisionAt: application.decisionAt,
          family: {
            fatherLastName: application.family.fatherLastName,
            fatherFirstName: application.family.fatherFirstName,
            motherLastName: application.family.motherLastName,
            motherFirstName: application.family.motherFirstName,
            contactEmail: application.family.contactEmail,
            contactPhone: application.family.contactPhone
          },
          students: application.students.map((student) => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            admissionStatus: student.admissionStatus,
            level: {
              code: student.level.code,
              label: student.level.label
            }
          })),
          recommendedEmailType,
          hasSentEmail: Boolean(lastSentEmailLog),
          lastEmailSentAt: lastSentEmailLog?.sentAt ?? lastSentEmailLog?.createdAt ?? null
        };
      })
      .filter((application): application is NonNullable<typeof application> =>
        application !== null
      )
  );
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
    select: {
      id: true,
      status: true,
      decisionAt: true
    }
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
    select: {
      id: true,
      status: true,
      decisionAt: true
    }
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
        decisionAt:
          existingApplication.status === status ? existingApplication.decisionAt : null,
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
  const emailType = getQueryParam(req.body?.emailType ?? req.body?.mailType);
  const subject = getQueryParam(req.body?.subject);
  const body = getQueryParam(req.body?.body);
  const payloadRecipientEmail = getQueryParam(req.body?.recipientEmail);
  const shouldSyncDecisionAt = getBooleanPayloadParam(req.body?.syncDecisionAt);

  if (!emailType || !isApplicationEmailType(emailType)) {
    throw badRequest("Invalid email type");
  }

  if (!subject || !body) {
    throw badRequest("Invalid email payload");
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      family: true,
      students: true
    }
  });

  if (!application) {
    throw notFound("Application not found");
  }

  const familyEmail = application.family.contactEmail.trim();
  const recipientEmail = payloadRecipientEmail ?? familyEmail;

  if (!recipientEmail) {
    throw badRequest("Missing recipient email");
  }

  if (!isValidEmailAddress(recipientEmail)) {
    throw badRequest("Invalid recipient email");
  }

  if (
    payloadRecipientEmail &&
    payloadRecipientEmail.toLowerCase() !== familyEmail.toLowerCase()
  ) {
    throw badRequest("Recipient email must match the family contact email");
  }

  const emailTypeMismatchMessage = getEmailTypeMismatchMessage(
    emailType,
    application.status
  );

  if (emailTypeMismatchMessage) {
    throw badRequest(emailTypeMismatchMessage);
  }

  try {
    await sendApplicationMail({
      to: recipientEmail,
      subject,
      body
    });
  } catch (error) {
    const failedEmailLog = await prisma.applicationEmailLog.create({
      data: {
        applicationId: application.id,
        emailType,
        recipientEmail,
        subject,
        bodySnapshot: body,
        sendStatus: EmailSendStatus.FAILED
      }
    });

    console.error("Failed to send application email", error);

    res.status(502).json({
      ...failedEmailLog,
      message:
        error instanceof Error && error.message === "SMTP configuration is incomplete"
          ? "SMTP configuration is incomplete"
          : "Email sending failed"
    });
    return;
  }

  const sentAt = new Date();
  const decisionStatus = getDecisionStatusFromEmailType(emailType);
  const shouldRefreshDecisionAt =
    shouldSyncDecisionAt &&
    !decisionStatus &&
    (application.status === ApplicationStatus.ACCEPTED ||
      application.status === ApplicationStatus.WAITLISTED ||
      application.status === ApplicationStatus.REFUSED ||
      application.status === ApplicationStatus.PARTIALLY_ACCEPTED);

  const emailLog = await prisma.$transaction(async (transaction) => {
    const createdEmailLog = await transaction.applicationEmailLog.create({
      data: {
        applicationId: application.id,
        emailType,
        recipientEmail,
        subject,
        bodySnapshot: body,
        sentAt,
        sendStatus: EmailSendStatus.SENT
      }
    });

    if (decisionStatus) {
      await transaction.application.update({
        where: { id: application.id },
        data: {
          status: decisionStatus,
          decisionAt: sentAt
        }
      });
    } else if (shouldRefreshDecisionAt) {
      await transaction.application.update({
        where: { id: application.id },
        data: {
          decisionAt: sentAt
        }
      });
    }

    return createdEmailLog;
  });

  res.status(201).json({
    ...emailLog,
    message: "Email sent and logged successfully"
  });
};
