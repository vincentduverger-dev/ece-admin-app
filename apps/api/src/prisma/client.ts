import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { config } from "../config/env";

const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaPg({
    connectionString: config.database.url
  });

  return new PrismaClient({
    adapter,
    log: config.app.nodeEnv === "development" ? ["warn", "error"] : ["error"]
  });
};

type GlobalPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrisma;

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.app.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}
