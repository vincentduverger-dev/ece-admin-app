import {
  ApplicationStatus,
  EmailSendStatus,
  EmailType,
  StudentAdmissionStatus,
  Prisma
} from "@prisma/client";
import type { Request, Response } from "express";

import { badRequest, conflict, notFound } from "../lib/errors";
import { prisma } from "../prisma/client";
import { sendApplicationMail } from "../services/mailer.service";

const maxEmailAttachmentsTotalSize = 10 * 1024 * 1024;
const dangerousAttachmentExtensions = new Set([
  ".app",
  ".bat",
  ".cmd",
  ".com",
  ".cpl",
  ".dll",
  ".dmg",
  ".exe",
  ".gadget",
  ".hta",
  ".jar",
  ".js",
  ".jse",
  ".lnk",
  ".msi",
  ".msp",
  ".pif",
  ".ps1",
  ".scr",
  ".sh",
  ".vbs",
  ".vbe",
  ".wsf"
]);
const dangerousAttachmentMimeTypes = new Set([
  "application/javascript",
  "application/java-archive",
  "application/vnd.microsoft.portable-executable",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-msi",
  "application/x-sh",
  "text/javascript"
]);

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

const getAttachmentExtension = (filename: string): string => {
  const extensionStartIndex = filename.lastIndexOf(".");

  return extensionStartIndex >= 0
    ? filename.slice(extensionStartIndex).toLowerCase()
    : "";
};

const getEmailAttachmentsFromRequest = (req: Request) => {
  const files = Array.isArray(req.files)
    ? req.files
    : req.file
      ? [req.file]
      : [];

  if (files.length === 0) {
    return [];
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > maxEmailAttachmentsTotalSize) {
    throw badRequest("La taille totale des pièces jointes ne doit pas dépasser 10 Mo.");
  }

  for (const file of files) {
    const extension = getAttachmentExtension(file.originalname);
    const mimeType = file.mimetype.toLowerCase();

    if (
      dangerousAttachmentExtensions.has(extension) ||
      dangerousAttachmentMimeTypes.has(mimeType)
    ) {
      throw badRequest(`Le fichier ${file.originalname} n'est pas autorisé.`);
    }
  }

  return files.map((file) => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype
  }));
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

const missingCapacityMessage =
  "Impossible d'accepter cet élève : les places disponibles ne sont pas renseignées pour ce niveau.";
const fullCapacityMessage =
  "Impossible d'accepter cet élève : il n'y a plus de place disponible pour ce niveau.";

const lockLevelCapacityRows = async (
  transaction: Prisma.TransactionClient,
  schoolYearId: string,
  levelIds: string[]
): Promise<void> => {
  if (levelIds.length === 0) {
    return;
  }

  await transaction.$queryRaw`
    SELECT id
    FROM "LevelCapacity"
    WHERE "schoolYearId" = ${schoolYearId}
      AND "levelId" IN (${Prisma.join(levelIds)})
    FOR UPDATE
  `;
};

const assertAcceptanceCapacity = async (
  transaction: Prisma.TransactionClient,
  schoolYearId: string,
  requestedAcceptancesByLevelId: Map<string, number>
): Promise<void> => {
  const levelIds = [...requestedAcceptancesByLevelId.keys()];

  await lockLevelCapacityRows(transaction, schoolYearId, levelIds);

  const [levels, capacities, acceptedStudentsByLevel] = await Promise.all([
    transaction.level.findMany({
      where: { id: { in: levelIds } },
      select: { id: true, code: true }
    }),
    transaction.levelCapacity.findMany({
      where: {
        schoolYearId,
        levelId: { in: levelIds }
      },
      select: {
        levelId: true,
        availablePlaces: true
      }
    }),
    transaction.student.groupBy({
      by: ["levelId"],
      where: {
        levelId: { in: levelIds },
        admissionStatus: StudentAdmissionStatus.ACCEPTED,
        application: {
          schoolYearId
        }
      },
      _count: {
        _all: true
      }
    })
  ]);

  const levelById = new Map(levels.map((level) => [level.id, level]));
  const capacityByLevelId = new Map(
    capacities.map((capacity) => [capacity.levelId, capacity.availablePlaces])
  );
  const acceptedCountByLevelId = new Map(
    acceptedStudentsByLevel.map((level) => [level.levelId, level._count._all])
  );

  for (const [levelId, requestedAcceptances] of requestedAcceptancesByLevelId) {
    const level = levelById.get(levelId);
    const availablePlaces = capacityByLevelId.get(levelId);
    const acceptedStudentsCount = acceptedCountByLevelId.get(levelId) ?? 0;

    if (availablePlaces === undefined) {
      throw conflict(missingCapacityMessage, {
        code: "LEVEL_CAPACITY_MISSING",
        levelCode: level?.code ?? null,
        availablePlaces: null,
        acceptedStudentsCount,
        remainingPlaces: null
      });
    }

    const remainingPlaces = availablePlaces - acceptedStudentsCount;

    if (remainingPlaces < requestedAcceptances) {
      throw conflict(fullCapacityMessage, {
        code: "LEVEL_CAPACITY_FULL",
        levelCode: level?.code ?? null,
        availablePlaces,
        acceptedStudentsCount,
        remainingPlaces
      });
    }
  }
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

export const updateApplicationContactEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const contactEmail = getQueryParam(req.body?.contactEmail);

  if (!contactEmail || !isValidEmailAddress(contactEmail)) {
    throw badRequest("Invalid contact email");
  }

  const existingApplication = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      familyId: true
    }
  });

  if (!existingApplication) {
    throw notFound("Application not found");
  }

  const updatedFamily = await prisma.family.update({
    where: { id: existingApplication.familyId },
    data: { contactEmail },
    select: {
      id: true,
      contactEmail: true,
      contactPhone: true,
      fatherLastName: true,
      fatherFirstName: true,
      motherLastName: true,
      motherFirstName: true,
      postalAddress: true,
      familyStatus: true
    }
  });

  res.status(200).json({ family: updatedFamily });
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
      schoolYearId: true,
      status: true,
      decisionAt: true,
      students: {
        select: {
          levelId: true,
          admissionStatus: true
        }
      }
    }
  });

  if (!existingApplication) {
    throw notFound("Application not found");
  }

  const updatedApplication = await prisma.$transaction(async (transaction) => {
    if (status === StudentAdmissionStatus.ACCEPTED) {
      const requestedAcceptancesByLevelId = new Map<string, number>();

      for (const student of existingApplication.students) {
        if (student.admissionStatus === StudentAdmissionStatus.ACCEPTED) {
          continue;
        }

        requestedAcceptancesByLevelId.set(
          student.levelId,
          (requestedAcceptancesByLevelId.get(student.levelId) ?? 0) + 1
        );
      }

      await assertAcceptanceCapacity(
        transaction,
        existingApplication.schoolYearId,
        requestedAcceptancesByLevelId
      );
    }

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
        levelId: true,
        admissionStatus: true,
        application: {
          select: {
            schoolYearId: true,
            status: true
          }
        }
      }
    });

    if (!existingStudent) {
      throw notFound("Student not found");
    }

    if (
      admissionStatus === StudentAdmissionStatus.ACCEPTED &&
      existingStudent.admissionStatus !== StudentAdmissionStatus.ACCEPTED
    ) {
      await assertAcceptanceCapacity(
        transaction,
        existingStudent.application.schoolYearId,
        new Map([[existingStudent.levelId, 1]])
      );
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
  const attachments = getEmailAttachmentsFromRequest(req);

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
      attachments,
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
