// نسخة موحدة (singleton) من PrismaClient تتجنب إنشاء اتصالات مكررة
// أثناء hot-reload في وضع التطوير.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
