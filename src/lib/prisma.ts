import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { pullDb } from "./dbsync";

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

const base = new PrismaClient();
// after the shared DB file is replaced, drop pooled connections so SQLite
// cannot keep serving cached pages from the previous copy
(globalThis as { __sdReconnect?: () => Promise<void> }).__sdReconnect = () => base.$disconnect();

const makeClient = () =>
  base.$extends({
    query: {
      async $allOperations({ args, query }) {
        await pullDb(); // hosted demo: load the shared database copy if it changed
        return query(args);
      },
    },
  });

export const prisma = (globalForPrisma.prisma ?? makeClient()) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
