import type { Request, Response } from "express";

import { prisma } from "../prisma/client";

export const getLevels = async (_req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error("Failed to fetch levels:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateLevelAvailablePlaces = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const levelId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const availablePlaces = req.body?.availablePlaces;

    if (
      typeof availablePlaces !== "number" ||
      !Number.isInteger(availablePlaces) ||
      availablePlaces < 0
    ) {
      res.status(400).json({ message: "Invalid available places value" });
      return;
    }

    const existingLevel = await prisma.level.findUnique({
      where: { id: levelId },
      select: { id: true }
    });

    if (!existingLevel) {
      res.status(404).json({ message: "Level not found" });
      return;
    }

    const updatedLevel = await prisma.level.update({
      where: { id: levelId },
      data: { availablePlaces }
    });

    res.status(200).json(updatedLevel);
  } catch (error) {
    console.error("Failed to update level available places:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
