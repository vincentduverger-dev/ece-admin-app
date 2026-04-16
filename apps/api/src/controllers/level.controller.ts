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
