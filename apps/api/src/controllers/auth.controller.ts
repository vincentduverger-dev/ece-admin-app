import type { Request, Response } from "express";

import { ADMIN_ROLE, createAdminToken, isValidAdminLogin } from "../lib/admin-auth";
import { badRequest, unauthorized } from "../lib/errors";

type LoginRequestBody = {
  email?: unknown;
  password?: unknown;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const loginAdmin = (req: Request, res: Response): void => {
  const body = req.body as LoginRequestBody | undefined;
  const email = body?.email;
  const password = body?.password;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw badRequest("Email and password are required");
  }

  if (!isValidAdminLogin({ email, password })) {
    throw unauthorized("Invalid credentials");
  }

  res.status(200).json({
    token: createAdminToken(),
    user: {
      role: ADMIN_ROLE
    }
  });
};
