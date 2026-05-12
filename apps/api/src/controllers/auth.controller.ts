import type { Request, Response } from "express";
import { createHash, randomBytes } from "node:crypto";

import { config } from "../config/env";
import {
  ADMIN_ROLE,
  createAdminToken,
  findAdminAccountByEmail,
  isValidAdminLogin
} from "../lib/admin-auth";
import { badRequest, unauthorized } from "../lib/errors";
import { hashPassword } from "../lib/password-hash";
import { prisma } from "../prisma/client";
import { sendPasswordResetMail } from "../services/mailer.service";

type LoginRequestBody = {
  email?: unknown;
  password?: unknown;
};

type ForgotPasswordRequestBody = {
  email?: unknown;
};

type ResetPasswordRequestBody = {
  token?: unknown;
  password?: unknown;
};

const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Si cette adresse correspond à un compte administrateur, un e-mail de réinitialisation a été envoyé.";

const INVALID_LOGIN_MESSAGE = "Identifiants incorrects.";
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const hashResetToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

const buildResetLink = (token: string): string => {
  if (!config.frontend.url) {
    throw new Error("FRONTEND_URL is required to send password reset emails");
  }

  const resetUrl = new URL("/reset-password", config.frontend.url);
  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
};

const isValidPassword = (password: string): boolean => {
  return password.trim().length >= MIN_PASSWORD_LENGTH;
};

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as LoginRequestBody | undefined;
  const email = body?.email;
  const password = body?.password;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw badRequest("Email and password are required");
  }

  if (!(await isValidAdminLogin({ email, password }))) {
    throw unauthorized(INVALID_LOGIN_MESSAGE);
  }

  res.status(200).json({
    token: await createAdminToken(email),
    user: {
      role: ADMIN_ROLE
    }
  });
};

export const requestAdminPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = req.body as ForgotPasswordRequestBody | undefined;
  const email = body?.email;

  if (!isNonEmptyString(email)) {
    throw badRequest("Email is required");
  }

  const adminAccount = await findAdminAccountByEmail(email);

  if (adminAccount) {
    const token = randomBytes(32).toString("base64url");
    const resetLink = buildResetLink(token);

    await prisma.passwordResetToken.create({
      data: {
        adminAccountId: adminAccount.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)
      }
    });

    try {
      await sendPasswordResetMail(adminAccount.email, resetLink);
    } catch (error) {
      if (config.app.nodeEnv === "development") {
        console.error("Password reset email could not be sent.");
        console.error(error);
        console.log(`[DEV ONLY] Password reset link: ${resetLink}`);
      } else {
        throw error;
      }
    }
  }

  res.status(200).json({
    message: PASSWORD_RESET_SUCCESS_MESSAGE
  });
};

export const resetAdminPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = req.body as ResetPasswordRequestBody | undefined;
  const token = body?.token;
  const password = body?.password;

  if (!isNonEmptyString(token)) {
    throw badRequest("Le lien de réinitialisation est invalide ou expiré.");
  }

  if (!isNonEmptyString(password) || !isValidPassword(password)) {
    throw badRequest("Le mot de passe doit contenir au moins 8 caractères.");
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) }
  });

  if (
    !resetToken ||
    resetToken.usedAt !== null ||
    resetToken.expiresAt.getTime() <= Date.now()
  ) {
    throw badRequest("Le lien de réinitialisation est invalide ou expiré.");
  }

  await prisma.$transaction(async (tx) => {
    const usedAt = new Date();

    await tx.adminAccount.update({
      where: { id: resetToken.adminAccountId },
      data: {
        passwordHash: await hashPassword(password)
      }
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt
      }
    });
    await tx.passwordResetToken.updateMany({
      where: {
        adminAccountId: resetToken.adminAccountId,
        usedAt: null
      },
      data: {
        usedAt
      }
    });
  });

  res.status(200).json({
    message: "Votre mot de passe a été réinitialisé."
  });
};
