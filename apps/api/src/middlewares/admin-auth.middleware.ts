import type { RequestHandler } from "express";

import { verifyAdminToken } from "../lib/admin-auth";
import { unauthorized } from "../lib/errors";

const AUTHORIZATION_HEADER_PATTERN = /^Bearer\s+(.+)$/i;

const extractBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.match(AUTHORIZATION_HEADER_PATTERN);

  return match?.[1]?.trim() || null;
};

export const requireAdminAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearerToken(req.header("Authorization"));

  try {
    if (!token || !(await verifyAdminToken(token))) {
      next(unauthorized("Authentification requise."));
      return;
    }

    next();
  } catch (error) {
    next(error);
    return;
  }
};
