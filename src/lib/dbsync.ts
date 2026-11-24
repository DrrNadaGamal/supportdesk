import fs from "node:fs";
import path from "node:path";
import { put, head } from "@vercel/blob";
import { cookies } from "next/headers";

// Hosted-demo persistence. On Vercel every serverless route has its own
// temporary filesystem, so the SQLite demo database is kept as one file in a
// Vercel Blob store: it is pulled before a page renders (only when it changed)
// and pushed after every write. Last writer wins, which is fine for a demo.
// A production deployment would use Postgres instead. See README.

const LOCAL = "/tmp/supportdesk-demo.db";
const BLOB_PATH = "supportdesk/demo.db";
const MAX_AGE_MS = 6 * 3600_000; // auto-reset of visitor changes
let version = "";
let inflight: Promise<void> | null = null;
let lastCheck = 0;
const markStale = () => {
  (globalThis as { __sdStale?: boolean }).__sdStale = true;
};

export const syncEnabled = () => !!process.env.VERCEL && !!process.env.BLOB_READ_WRITE_TOKEN;

function bundled() {
  return path.join(process.cwd(), "prisma", "demo.db");
}

export const COOKIE = "sd_db";

async function push(): Promise<string> {
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
  return `${version}|${blob.url}`;
}

export function pullDb(): Promise<void> {
  if (!syncEnabled()) return Promise.resolve();
  if (inflight) return inflight;
  if (Date.now() - lastCheck < 300) return Promise.resolve();
  inflight = doPull().finally(() => {
    lastCheck = Date.now();
    inflight = null;
  });
  return inflight;
}

async function doPull() {
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
    let v = `${h.uploadedAt.getTime()}:${h.size}`;
    let url = h.url;
    // read-your-writes: the browser carries the version its own last write produced,
    // in case the blob metadata lookup has not caught up yet
    try {
      const c = (await cookies()).get(COOKIE)?.value;
      if (c) {
        const [cv, cu] = c.split("|");
        if (Number(cv.split(":")[0]) > h.uploadedAt.getTime() && cu.includes(".blob.vercel-storage.com")) {
          v = cv;
          url = cu;
        }
      }
    } catch {}
    if (v === version && fs.existsSync(LOCAL)) return;
    const res = await fetch(`${url}?v=${encodeURIComponent(v)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`blob fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // overwrite in place (same inode, no truncate first) so open connections see it
    // and a concurrent reader never sees an empty file
    const fd = fs.openSync(LOCAL, fs.existsSync(LOCAL) ? "r+" : "w");
    try {
      fs.writeSync(fd, buf, 0, buf.length, 0);
      fs.ftruncateSync(fd, buf.length);
    } finally {
      fs.closeSync(fd);
    }
    version = v;
    markStale();
  } catch (e) {
    console.error("pullDb failed", e);
  }
}

export async function pushDb(): Promise<string | null> {
  if (!syncEnabled()) return null;
  try {
    return await push();
  } catch (e) {
    console.error("pushDb failed", e);
    return null;
  }
}

export async function resetDemo(): Promise<string | null> {
  if (!syncEnabled()) return null;
  fs.copyFileSync(bundled(), LOCAL);
  markStale();
  return push();
}
