import type { Request, Response } from "express";

import { badRequest, notFound } from "../lib/errors";
import { prisma } from "../prisma/client";

export const getLevels = async (_req: Request, res: Response): Promise<void> => {
  const levels = await prisma.level.findMany({
    select: {
      id: true,
      code: true,
      label: true,
      sortOrder: true,
      availablePlaces: true
    },
    orderBy: { sortOrder: "asc" }
  });

  res.status(200).json(levels);
};

export const updateLevelAvailablePlaces = async (
  req: Request,
  res: Response
): Promise<void> => {
  const levelId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const availablePlaces = req.body?.availablePlaces;

  if (
    typeof availablePlaces !== "number" ||
    !Number.isInteger(availablePlaces) ||
    availablePlaces < 0
  ) {
    throw badRequest("Invalid available places value");
  }

  const existingLevel = await prisma.level.findUnique({
    where: { id: levelId },
    select: { id: true }
  });

  if (!existingLevel) {
    throw notFound("Level not found");
  }

  const updatedLevel = await prisma.level.update({
    where: { id: levelId },
    data: { availablePlaces }
  });

  res.status(200).json(updatedLevel);
};
