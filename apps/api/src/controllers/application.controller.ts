import {
  ApplicationStatus,
  EmailSendStatus,
  EmailType,
  type Prisma
} from "@prisma/client";
import type { Request, Response } from "express";

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

type ApplicationDecisionStatus = "ACCEPTED" | "REFUSED";
type ApplicationEmailType = "ACCEPTANCE" | "REFUSAL" | "CUSTOM";

const isApplicationDecisionStatus = (
  value: string
): value is ApplicationDecisionStatus => {
  return value === "ACCEPTED" || value === "REFUSED";
};

const isApplicationEmailType = (value: string): value is ApplicationEmailType => {
  return (
    value === EmailType.ACCEPTANCE ||
    value === EmailType.REFUSAL ||
    value === EmailType.CUSTOM
  );
};

export const getApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = getQueryParam(req.query.status);
    const schoolYearId = getQueryParam(req.query.schoolYearId);
    const isPriority = getQueryParam(req.query.isPriority);
    const search = getQueryParam(req.query.search);
    const where: Prisma.ApplicationWhereInput = {};

    if (status) {
      if (!isApplicationStatus(status)) {
        res.status(400).json({ message: "Invalid application status" });
        return;
      }

      where.status = status;
    }

    if (schoolYearId) {
      where.schoolYearId = schoolYearId;
    }

    if (isPriority) {
      if (isPriority !== "true" && isPriority !== "false") {
        res.status(400).json({ message: "Invalid priority filter" });
        return;
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

export const getApplicationEmailLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true }
    });

    if (!existingApplication) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const emailLogs = await prisma.applicationEmailLog.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json(emailLogs);
  } catch (error) {
    console.error("Failed to fetch application email logs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const status = getQueryParam(req.body?.status);

    if (!status || !isApplicationStatus(status)) {
      res.status(400).json({ message: "Invalid application status" });
      return;
    }

    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true }
    });

    if (!existingApplication) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { status }
    });

    res.status(200).json(updatedApplication);
  } catch (error) {
    console.error("Failed to update application status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateApplicationPriority = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isPriority = req.body?.isPriority;

    if (typeof isPriority !== "boolean") {
      res.status(400).json({ message: "Invalid priority value" });
      return;
    }

    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true }
    });

    if (!existingApplication) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { isPriority }
    });

    res.status(200).json(updatedApplication);
  } catch (error) {
    console.error("Failed to update application priority:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateApplicationDecision = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const status = getQueryParam(req.body?.status);
    const decisionNote = typeof req.body?.decisionNote === "string" ? req.body.decisionNote : null;

    if (!status || !isApplicationDecisionStatus(status)) {
      res.status(400).json({ message: "Invalid application decision status" });
      return;
    }

    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true }
    });

    if (!existingApplication) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        decisionAt: new Date(),
        decisionNote
      }
    });

    res.status(200).json(updatedApplication);
  } catch (error) {
    console.error("Failed to update application decision:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendApplicationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const emailType = getQueryParam(req.body?.emailType);
    const subject = getQueryParam(req.body?.subject);
    const body = getQueryParam(req.body?.body);

    if (!emailType || !isApplicationEmailType(emailType)) {
      res.status(400).json({ message: "Invalid email type" });
      return;
    }

    if (!subject || !body) {
      res.status(400).json({ message: "Invalid email payload" });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        family: true
      }
    });

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const recipientEmail = application.family.contactEmail.trim();

    if (!recipientEmail) {
      res.status(400).json({ message: "Missing recipient email" });
      return;
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
  } catch (error) {
    console.error("Failed to send application email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
