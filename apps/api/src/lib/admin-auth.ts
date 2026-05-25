import type { AdminAccount } from "@prisma/client";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { config } from "../config/env";
import { prisma } from "../prisma/client";
import { AppError } from "./errors";
import { hashPassword, verifyPassword } from "./password-hash";

const ADMIN_ROLE = "admin" as const;
const ADMIN_TOKEN_PREFIX = "admin";
const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

type AdminTokenPayload = {
  email: string;
  role: typeof ADMIN_ROLE;
  iat: number;
  nonce: string;
};

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

const isAdminTokenPayload = (value: unknown): value is AdminTokenPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AdminTokenPayload>;

  return (
    typeof candidate.email === "string" &&
    candidate.email.trim().length > 0 &&
    candidate.role === ADMIN_ROLE &&
    typeof candidate.iat === "number" &&
    Number.isFinite(candidate.iat) &&
    typeof candidate.nonce === "string" &&
    candidate.nonce.trim().length > 0
  );
};

const createAdminTokenSignature = (
  encodedPayload: string,
  adminAccount: AdminAccount
): string => {
  return createHmac("sha256", `${adminAccount.email}:${adminAccount.passwordHash}`)
    .update(encodedPayload)
    .digest("base64url");
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
  const signature = createAdminTokenSignature(encodedPayload, adminAccount);

  return `admin.${encodedPayload}.${signature}`;
};

export const verifyAdminToken = async (token: string): Promise<boolean> => {
  const [prefix, encodedPayload, signature, extraPart] = token.split(".");

  if (
    prefix !== ADMIN_TOKEN_PREFIX ||
    !encodedPayload ||
    !signature ||
    extraPart !== undefined
  ) {
    return false;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  if (!isAdminTokenPayload(payload)) {
    return false;
  }

  const tokenAgeMs = Date.now() - payload.iat;

  if (tokenAgeMs < 0 || tokenAgeMs > ADMIN_TOKEN_TTL_MS) {
    return false;
  }

  const adminAccount = await findAdminAccountByEmail(payload.email);

  if (!adminAccount || !safeCompare(normalizeAdminEmail(payload.email), adminAccount.email)) {
    return false;
  }

  return safeCompare(signature, createAdminTokenSignature(encodedPayload, adminAccount));
};

export { ADMIN_ROLE };
