import fs from "node:fs";
import path from "node:path";
import { put, head } from "@vercel/blob";
import { markStale } from "./fresh";

// Hosted-demo persistence. On Vercel every serverless route has its own
// temporary filesystem, so the SQLite demo database is kept as one file in a
// Vercel Blob store: it is pulled before a page renders (only when it changed)
// and pushed after every write. Last writer wins, which is fine for a demo.
// A production deployment would use Postgres instead. See README.

const LOCAL = "/tmp/supportdesk-demo.db";
const BLOB_PATH = "supportdesk/demo.db";
const MAX_AGE_MS = 6 * 3600_000; // auto-reset of visitor changes
let version = "";

export const syncEnabled = () => !!process.env.VERCEL && !!process.env.BLOB_READ_WRITE_TOKEN;

function bundled() {
  return path.join(process.cwd(), "prisma", "demo.db");
}

async function push() {
  const body = fs.readFileSync(LOCAL);
  const blob = await put(BLOB_PATH, body, {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/octet-stream",
    cacheControlMaxAge: 60,
  });
  const h = await head(blob.url);
  version = `${h.uploadedAt.getTime()}:${h.size}`;
}

export async function pullDb() {
  if (!syncEnabled()) return;
  try {
    let h: Awaited<ReturnType<typeof head>> | null = null;
    try {
      h = await head(BLOB_PATH);
    } catch {
      h = null;
    }
    if (!h || Date.now() - h.uploadedAt.getTime() > MAX_AGE_MS) {
      // first run, or visitor changes are older than the retention window: reset
      if (!fs.existsSync(LOCAL)) fs.copyFileSync(bundled(), LOCAL);
      fs.copyFileSync(bundled(), LOCAL);
      markStale();
      await push();
      return;
    }
    const v = `${h.uploadedAt.getTime()}:${h.size}`;
    if (v === version && fs.existsSync(LOCAL)) return;
    const res = await fetch(`${h.url}?v=${encodeURIComponent(v)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`blob fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(LOCAL, buf); // overwrite in place so open connections see it
    version = v;
    markStale();
  } catch (e) {
    console.error("pullDb failed", e);
  }
}

export async function pushDb() {
  if (!syncEnabled()) return;
  try {
    await push();
  } catch (e) {
    console.error("pushDb failed", e);
  }
}

export async function resetDemo() {
  if (!syncEnabled()) return;
  fs.copyFileSync(bundled(), LOCAL);
  markStale();
  await push();
}
