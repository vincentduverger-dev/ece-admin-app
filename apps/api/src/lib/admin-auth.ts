import type { AdminAccount } from "@prisma/client";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { config } from "../config/env";
import { prisma } from "../prisma/client";
import { AppError } from "./errors";
import { hashPassword, verifyPassword } from "./password-hash";

const ADMIN_ROLE = "admin" as const;

export const normalizeAdminEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

const safeCompare = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const getConfiguredAdminCredentials = (): { email: string; password: string } => {
  const { email, password } = config.admin;

  if (!email || !password) {
    throw new AppError("Admin credentials are not configured", 500);
  }

  return {
    email: normalizeAdminEmail(email),
    password
  };
};

const createConfiguredAdminAccount = async (): Promise<AdminAccount> => {
  const adminCredentials = getConfiguredAdminCredentials();

  return prisma.adminAccount.upsert({
    where: { email: adminCredentials.email },
    update: {},
    create: {
      email: adminCredentials.email,
      passwordHash: await hashPassword(adminCredentials.password)
    }
  });
};

export const findAdminAccountByEmail = async (
  email: string
): Promise<AdminAccount | null> => {
  const normalizedEmail = normalizeAdminEmail(email);
  const existingAdminAccount = await prisma.adminAccount.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingAdminAccount) {
    return existingAdminAccount;
  }

  const configuredAdmin = getConfiguredAdminCredentials();

  if (!safeCompare(normalizedEmail, configuredAdmin.email)) {
    return null;
  }

  return createConfiguredAdminAccount();
};

export const isValidAdminLogin = async (input: {
  email: string;
  password: string;
}): Promise<boolean> => {
  const adminAccount = await findAdminAccountByEmail(input.email);

  if (!adminAccount) {
    return false;
  }

  return (
    safeCompare(normalizeAdminEmail(input.email), adminAccount.email) &&
    (await verifyPassword(input.password, adminAccount.passwordHash))
  );
};

export const updateAdminPassword = async (
  adminAccountId: string,
  password: string
): Promise<void> => {
  await prisma.adminAccount.update({
    where: { id: adminAccountId },
    data: {
      passwordHash: await hashPassword(password)
    }
  });
};

export const createAdminToken = async (email: string): Promise<string> => {
  const adminAccount = await findAdminAccountByEmail(email);

  if (!adminAccount) {
    throw new AppError("Admin credentials are not configured", 500);
  }

  const payload = {
    email: adminAccount.email,
    role: ADMIN_ROLE,
    iat: Date.now(),
    nonce: randomBytes(16).toString("hex")
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac(
    "sha256",
    `${adminAccount.email}:${adminAccount.passwordHash}`
  )
    .update(encodedPayload)
    .digest("base64url");

  return `admin.${encodedPayload}.${signature}`;
};

export { ADMIN_ROLE };
