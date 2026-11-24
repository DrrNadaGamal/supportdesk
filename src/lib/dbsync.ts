import fs from "node:fs";
import path from "node:path";
import { put, list, del } from "@vercel/blob";
import { cookies } from "next/headers";

// Hosted-demo persistence. On Vercel every serverless route has its own
// temporary filesystem, so the SQLite demo database is kept in a Vercel Blob
// store. Each write uploads a new immutable copy (supportdesk/db-<time>.db);
// requests load the newest copy when it changed. Last writer wins, which is
// fine for a demo. A production deployment would use Postgres. See README.

const LOCAL = "/tmp/supportdesk-demo.db";
const PREFIX = "supportdesk/db-";
const MAX_AGE_MS = 6 * 3600_000; // auto-reset of visitor changes
export const COOKIE = "sd_db";
let version = 0;
let inflight: Promise<void> | null = null;
let lastCheck = 0;

type G = { __sdStale?: boolean; __sdReconnect?: () => Promise<void> };
const g = globalThis as G;
const markStale = () => {
  g.__sdStale = true;
};

export const syncEnabled = () => !!process.env.VERCEL && !!process.env.BLOB_READ_WRITE_TOKEN;
const bundled = () => path.join(process.cwd(), "prisma", "demo.db");
const stampOf = (pathname: string) => Number(pathname.slice(PREFIX.length).replace(".db", "")) || 0;

async function newest() {
  const { blobs } = await list({ prefix: PREFIX, limit: 100 });
  const sorted = blobs.map((b) => ({ t: stampOf(b.pathname), url: b.url, pathname: b.pathname })).sort((a, b) => b.t - a.t);
  return { latest: sorted[0] ?? null, all: sorted };
}

async function push(): Promise<string> {
  const body = fs.readFileSync(LOCAL);
  const t = Date.now();
  const blob = await put(`${PREFIX}${t}.db`, body, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/octet-stream",
  });
  version = t;
  // keep only the two newest copies
  try {
    const { all } = await newest();
    const old = all.slice(2).map((b) => b.url);
    if (old.length) await del(old);
  } catch {}
  return `${t}|${blob.url}`;
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

function overwriteLocal(buf: Buffer) {
  // same inode, no truncate first, so open connections see it and a concurrent
  // reader never sees an empty file
  const fd = fs.openSync(LOCAL, fs.existsSync(LOCAL) ? "r+" : "w");
  try {
    fs.writeSync(fd, buf, 0, buf.length, 0);
    fs.ftruncateSync(fd, buf.length);
  } finally {
    fs.closeSync(fd);
  }
}

async function doPull() {
  try {
    const { latest } = await newest().catch(() => ({ latest: null }));
    let t = latest?.t ?? 0;
    let url = latest?.url ?? "";
    // read-your-writes: the browser carries the copy its own last write produced
    try {
      const c = (await cookies()).get(COOKIE)?.value;
      if (c) {
        const [ct, cu] = c.split("|");
        if (Number(ct) > t && cu?.includes(".blob.vercel-storage.com")) {
          t = Number(ct);
          url = cu;
        }
      }
    } catch {}
    if (!t || Date.now() - t > MAX_AGE_MS) {
      // first run, or visitor changes are older than the retention window: reset
      fs.copyFileSync(bundled(), LOCAL);
      markStale();
      await push();
      await g.__sdReconnect?.();
      return;
    }
    if (t === version && fs.existsSync(LOCAL)) return;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`blob fetch ${res.status}`);
    overwriteLocal(Buffer.from(await res.arrayBuffer()));
    version = t;
    markStale();
    await g.__sdReconnect?.();
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
