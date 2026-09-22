import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { fitfixPrisma?: PrismaClient };
export const db = globalForPrisma.fitfixPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.fitfixPrisma = db;
