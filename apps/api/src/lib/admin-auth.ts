import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { config } from "../config/env";
import { AppError } from "./errors";

const ADMIN_ROLE = "admin" as const;

const normalizeEmail = (email: string): string => {
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
    email: normalizeEmail(email),
    password
  };
};

export const isValidAdminLogin = (input: {
  email: string;
  password: string;
}): boolean => {
  const adminCredentials = getConfiguredAdminCredentials();

  return (
    safeCompare(normalizeEmail(input.email), adminCredentials.email) &&
    safeCompare(input.password, adminCredentials.password)
  );
};

export const createAdminToken = (): string => {
  const adminCredentials = getConfiguredAdminCredentials();
  const payload = {
    email: adminCredentials.email,
    role: ADMIN_ROLE,
    iat: Date.now(),
    nonce: randomBytes(16).toString("hex")
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac(
    "sha256",
    `${adminCredentials.email}:${adminCredentials.password}`
  )
    .update(encodedPayload)
    .digest("base64url");

  return `admin.${encodedPayload}.${signature}`;
};

export { ADMIN_ROLE };
