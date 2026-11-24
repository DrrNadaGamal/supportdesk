import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

// Hosted demo mode (Vercel): the serverless filesystem is read-only, so the
// pre-seeded SQLite demo database is copied to /tmp on cold start. Changes
// made in the hosted demo are temporary and reset when the instance recycles.
if (process.env.VERCEL) {
  const target = "/tmp/supportdesk-demo.db";
  try {
    if (!fs.existsSync(target)) {
      fs.copyFileSync(path.join(process.cwd(), "prisma", "demo.db"), target);
    }
    process.env.DATABASE_URL = `file:${target}`;
  } catch (err) {
    console.error("demo database copy failed", err);
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
