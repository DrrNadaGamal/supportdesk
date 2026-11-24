import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AGENT_COOKIE, CUSTOMER_COOKIE, currentAgent } from "@/lib/session";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { dueDates, PRIORITIES, STATUSES } from "@/lib/sla";
import { pullDb, pushDb, resetDemo } from "@/lib/dbsync";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function go(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}
function back(req: NextRequest, fallback: string) {
  const ref = req.headers.get("referer");
  try {
    if (ref) {
      const u = new URL(ref);
      if (u.host === new URL(req.url).host) return go(req, u.pathname + u.search);
    }
  } catch {}
  return go(req, fallback);
}

async function handle(req: NextRequest, f: FormData) {
  const intent = s(f, "intent");
  const secure = req.nextUrl.protocol === "https:";
  const cookieOpts = { path: "/", sameSite: "lax" as const, httpOnly: true, secure };

  switch (intent) {
    case "locale": {
      const res = back(req, "/");
      res.cookies.set(LOCALE_COOKIE, s(f, "locale") === "ar" ? "ar" : "en", { path: "/", sameSite: "lax" });
      return res;
    }
    case "agent_login": {
      const agent = await prisma.agent.findUnique({ where: { id: s(f, "agentId") } });
      const res = go(req, agent ? "/app" : "/login");
      if (agent) res.cookies.set(AGENT_COOKIE, agent.id, cookieOpts);
      return res;
    }
    case "agent_logout": {
      const res = go(req, "/");
      res.cookies.delete(AGENT_COOKIE);
      return res;
    }
    case "customer_login": {
      const c = await prisma.customer.findUnique({ where: { id: s(f, "customerId") } });
      const res = go(req, c ? "/portal" : "/portal");
      if (c) res.cookies.set(CUSTOMER_COOKIE, c.id, cookieOpts);
      return res;
    }
    case "customer_logout": {
      const res = go(req, "/");
      res.cookies.delete(CUSTOMER_COOKIE);
      return res;
    }
    case "helpful": {
      const id = s(f, "articleId");
      const yes = s(f, "vote") === "yes";
      await prisma.article.update({ where: { id }, data: yes ? { helpful: { increment: 1 } } : { notHelpful: { increment: 1 } } }).catch(() => null);
      const res = back(req, "/help");
      res.cookies.set(`sd_voted_${id}`, "1", { path: "/", maxAge: 86400 });
      return res;
    }
    case "ticket_create": {
      const name = s(f, "name").slice(0, 80);
      const email = s(f, "email").toLowerCase().slice(0, 120);
      const subject = s(f, "subject").slice(0, 160);
      const body = s(f, "body").slice(0, 4000);
      const categoryId = s(f, "categoryId");
      const priority = (PRIORITIES as readonly string[]).includes(s(f, "priority")) ? s(f, "priority") : "NORMAL";
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || !subject || !body) return go(req, "/portal/new?error=1");
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) return go(req, "/portal/new?error=1");
      let customer = await prisma.customer.findUnique({ where: { email } });
      if (!customer) {
        customer = await prisma.customer.create({ data: { name, email, company: "-", plan: "Free", lang: req.cookies.get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "en" } });
      }
      const last = await prisma.ticket.findFirst({ orderBy: { number: "desc" } });
      const number = (last?.number ?? 1000) + 1;
      const now = new Date();
      await prisma.ticket.create({
        data: {
          number, subject, priority, channel: "WEB", customerId: customer.id, categoryId: cat.id,
          createdAt: now, updatedAt: now, ...dueDates(priority, now),
          messages: { create: [{ authorType: "CUSTOMER", customerId: customer.id, body, createdAt: now }] },
        },
      });
      const res = go(req, `/portal/t/${number}?created=1`);
      res.cookies.set(CUSTOMER_COOKIE, customer.id, cookieOpts);
      return res;
    }
    case "customer_reply": {
      const number = Number(s(f, "number"));
      const body = s(f, "body").slice(0, 4000);
      const ck = req.cookies.get(CUSTOMER_COOKIE)?.value;
      const ticket = await prisma.ticket.findUnique({ where: { number } });
      if (!ticket || !ck || ticket.customerId !== ck || !body) return go(req, "/portal");
      const now = new Date();
      await prisma.message.create({ data: { ticketId: ticket.id, authorType: "CUSTOMER", customerId: ck, body, createdAt: now } });
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: now, ...(ticket.status !== "OPEN" ? { status: "OPEN", resolvedAt: null } : {}) },
      });
      return go(req, `/portal/t/${number}`);
    }
    case "rate": {
      const number = Number(s(f, "number"));
      const score = Math.min(5, Math.max(1, Number(s(f, "score")) || 0));
      const ck = req.cookies.get(CUSTOMER_COOKIE)?.value;
      const ticket = await prisma.ticket.findUnique({ where: { number } });
      if (ticket && ck && ticket.customerId === ck && score) {
        await prisma.ticket.update({ where: { id: ticket.id }, data: { satisfaction: score } });
      }
      return go(req, `/portal/t/${number}`);
    }
  }

  // everything below requires an agent session
  const agent = await currentAgent();
  if (!agent) return go(req, "/login");

  switch (intent) {
    case "ticket_reply": {
      const number = Number(s(f, "number"));
      const body = s(f, "body").slice(0, 6000);
      const note = s(f, "mode") === "note";
      const resolve = s(f, "resolve") === "1" && !note;
      const ticket = await prisma.ticket.findUnique({ where: { number } });
      if (!ticket || !body) return back(req, "/app/tickets");
      const now = new Date();
      await prisma.message.create({ data: { ticketId: ticket.id, authorType: "AGENT", agentId: agent.id, internal: note, body, createdAt: now } });
      const data: Record<string, unknown> = { updatedAt: now };
      if (!ticket.assigneeId) data.assigneeId = agent.id;
      if (!note) {
        if (!ticket.firstResponseAt) data.firstResponseAt = now;
        data.status = resolve ? "RESOLVED" : "PENDING";
        if (resolve) data.resolvedAt = now;
      }
      await prisma.ticket.update({ where: { id: ticket.id }, data });
      return go(req, `/app/tickets/${number}`);
    }
    case "ticket_update": {
      const number = Number(s(f, "number"));
      const ticket = await prisma.ticket.findUnique({ where: { number } });
      if (!ticket) return back(req, "/app/tickets");
      const data: Record<string, unknown> = { updatedAt: new Date() };
      const status = s(f, "status");
      if ((STATUSES as readonly string[]).includes(status) && status !== ticket.status) {
        data.status = status;
        data.resolvedAt = status === "RESOLVED" || status === "CLOSED" ? ticket.resolvedAt ?? new Date() : null;
      }
      const pr = s(f, "priority");
      if ((PRIORITIES as readonly string[]).includes(pr) && pr !== ticket.priority) {
        data.priority = pr;
        Object.assign(data, dueDates(pr, ticket.createdAt));
      }
      if (f.has("assigneeId")) {
        const a = s(f, "assigneeId");
        data.assigneeId = a === "" ? null : (await prisma.agent.findUnique({ where: { id: a } }))?.id ?? ticket.assigneeId;
      }
      const cat = s(f, "categoryId");
      if (cat && (await prisma.category.findUnique({ where: { id: cat } }))) data.categoryId = cat;
      await prisma.ticket.update({ where: { id: ticket.id }, data });
      return go(req, `/app/tickets/${number}`);
    }
    case "assign_me": {
      const number = Number(s(f, "number"));
      await prisma.ticket.update({ where: { number }, data: { assigneeId: agent.id, updatedAt: new Date() } }).catch(() => null);
      return back(req, "/app/tickets");
    }
  }

  if (agent.role !== "ADMIN") return go(req, "/app");

  switch (intent) {
    case "article_save": {
      const id = s(f, "id");
      const titleEn = s(f, "titleEn"), titleAr = s(f, "titleAr") || titleEn;
      const bodyEn = s(f, "bodyEn"), bodyAr = s(f, "bodyAr") || bodyEn;
      const categoryId = s(f, "categoryId");
      if (!titleEn || !bodyEn || !categoryId) return back(req, "/app/kb");
      const published = s(f, "published") === "1";
      const data = { titleEn, titleAr, bodyEn, bodyAr, categoryId, published, updatedAt: new Date() };
      if (id) await prisma.article.update({ where: { id }, data });
      else {
        const base = titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "article";
        const slug = (await prisma.article.findUnique({ where: { slug: base } })) ? `${base}-${Date.now() % 10000}` : base;
        await prisma.article.create({ data: { ...data, slug } });
      }
      return go(req, "/app/kb");
    }
    case "article_delete":
      await prisma.article.delete({ where: { id: s(f, "id") } }).catch(() => null);
      return go(req, "/app/kb");
    case "canned_save": {
      const titleEn = s(f, "titleEn"), bodyEn = s(f, "bodyEn");
      if (!titleEn || !bodyEn) return back(req, "/app/canned");
      await prisma.cannedReply.create({ data: { titleEn, titleAr: s(f, "titleAr") || titleEn, bodyEn, bodyAr: s(f, "bodyAr") || bodyEn } });
      return go(req, "/app/canned");
    }
    case "canned_delete":
      await prisma.cannedReply.delete({ where: { id: s(f, "id") } }).catch(() => null);
      return go(req, "/app/canned");
    case "reset_demo":
      await resetDemo();
      return go(req, "/app/settings?reset=1");
  }
  return go(req, "/app");
}

const WRITES = ["ticket_create", "customer_reply", "rate", "helpful", "ticket_reply", "ticket_update", "assign_me", "article_save", "article_delete", "canned_save", "canned_delete"];

export async function POST(req: NextRequest) {
  const f = await req.formData();
  // Hosted demo: load the shared database first, and save it after any write.
  await pullDb();
  const res = await handle(req, f);
  if (WRITES.includes(String(f.get("intent") ?? ""))) await pushDb();
  return res;
}
