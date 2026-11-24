import { PrismaClient } from "@prisma/client";
import { AGENTS, CUSTOMERS, CATEGORIES, TEMPLATES, FOLLOWUP, RESOLVE, NOTES, CANNED, ARTICLES } from "./seed-data";
import { SLA_HOURS } from "../src/lib/sla";

const prisma = new PrismaClient();

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261124);
const pickOne = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
const between = (a: number, b: number) => a + R() * (b - a);
const H = 3600_000;

async function main() {
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.article.deleteMany();
  await prisma.cannedReply.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.meta.deleteMany();

  const now = Date.now();
  await prisma.meta.create({ data: { key: "seededAt", value: String(now) } });

  const agents = [];
  for (const a of AGENTS) agents.push(await prisma.agent.create({ data: a }));
  const customers = [];
  for (const c of CUSTOMERS) customers.push(await prisma.customer.create({ data: c }));
  const cats: Record<string, string> = {};
  for (const c of CATEGORIES) cats[c.slug] = (await prisma.category.create({ data: c })).id;
  for (const c of CANNED) await prisma.cannedReply.create({ data: c });
  for (const a of ARTICLES) {
    const { cat, ...rest } = a;
    await prisma.article.create({ data: { ...rest, categoryId: cats[cat], updatedAt: new Date(now - between(2, 60) * 24 * H) } });
  }

  const N = 72;
  let number = 1041;
  const arabicAgent = agents[2];
  const rows = Array.from({ length: N }, (_, i) => ({ i, age: i < 6 ? between(5, 30) : Math.pow(R(), 1.7) * 21 * 24 + 0.3 }));
  rows.sort((a, b) => b.age - a.age);

  for (const { i, age } of rows) {
    number += 1;
    const tpl = TEMPLATES[(i * 7 + Math.floor(R() * 5)) % TEMPLATES.length];
    const cust = pickOne(customers);
    const ar = cust.lang === "ar";
    const forced = i < 6;
    const priority = forced ? pickOne(["HIGH", "URGENT", "HIGH"]) : tpl.pri;
    const [frH, rsH] = SLA_HOURS[priority];
    const createdAt = now - age * H;

    // status plan
    let status: string;
    const u = R();
    if (forced) status = "OPEN";
    else if (age > 24 * 5) status = u < 0.9 ? (age > 24 * 10 && R() < 0.7 ? "CLOSED" : "RESOLVED") : u < 0.95 ? "ON_HOLD" : "PENDING";
    else if (age > 24) status = u < 0.55 ? "RESOLVED" : u < 0.75 ? "PENDING" : u < 0.9 ? "OPEN" : "ON_HOLD";
    else status = u < 0.55 ? "OPEN" : u < 0.8 ? "PENDING" : u < 0.9 ? "RESOLVED" : "ON_HOLD";

    let assignee: (typeof agents)[number] | null = null;
    const unassignedChance = forced ? 0.5 : age < 2 ? 0.5 : status === "OPEN" && age < 12 ? 0.25 : 0.03;
    if (R() >= unassignedChance) assignee = ar && R() < 0.55 ? arabicAgent : pickOne(agents);
    if (!assignee && status !== "OPEN") status = "OPEN";

    const msgs: Array<{ authorType: string; agentId?: string; customerId?: string; internal?: boolean; body: string; createdAt: Date }> = [];
    msgs.push({ authorType: "CUSTOMER", customerId: cust.id, body: ar ? tpl.bAr : tpl.bEn, createdAt: new Date(createdAt) });

    let firstResponseAt: Date | null = null;
    let resolvedAt: Date | null = null;
    let satisfaction: number | null = null;
    let last = createdAt;

    if (assignee) {
      const frT = createdAt + frH * H * (forced ? between(1.2, 2.5) : between(0.1, 1.25));
      if (frT < now - 60_000) {
        firstResponseAt = new Date(frT);
        msgs.push({ authorType: "AGENT", agentId: assignee.id, body: ar ? tpl.rAr : tpl.rEn, createdAt: firstResponseAt });
        last = frT;
        if (R() < 0.3) {
          const nt = frT + between(0.1, 1) * H;
          if (nt < now) { msgs.push({ authorType: "AGENT", agentId: assignee.id, internal: true, body: pickOne(NOTES), createdAt: new Date(nt) }); last = Math.max(last, nt); }
        }
        if (["PENDING", "RESOLVED", "CLOSED"].includes(status) || R() < 0.25) {
          const ft = frT + between(0.5, 6) * H;
          if (ft < now) {
            const f = FOLLOWUP[ar ? "ar" : "en"];
            msgs.push({ authorType: "CUSTOMER", customerId: cust.id, body: status === "PENDING" ? f[2] : f[0], createdAt: new Date(ft) });
            last = ft;
          }
        }
        if (status === "RESOLVED" || status === "CLOSED") {
          let rt = last + between(0.3, Math.max(0.5, rsH * 0.9 - (last - createdAt) / H));
          if (rt > now - 30_000) rt = now - between(0.1, 1) * H;
          if (rt < last) rt = last + 60_000;
          resolvedAt = new Date(rt);
          msgs.push({ authorType: "AGENT", agentId: assignee.id, body: RESOLVE[ar ? "ar" : "en"], createdAt: resolvedAt });
          last = rt;
          if (R() < 0.78) satisfaction = pickOne([5, 5, 5, 5, 4, 4, 4, 3, 3, 2, 1]);
        }
      } else if (status !== "OPEN") status = "OPEN";
    }
    if (!firstResponseAt && !["OPEN"].includes(status)) status = "OPEN";

    await prisma.ticket.create({
      data: {
        number,
        subject: ar ? tpl.subAr : tpl.subEn,
        status, priority, channel: tpl.ch, tags: tpl.tags,
        customerId: cust.id, categoryId: cats[tpl.cat], assigneeId: assignee?.id ?? null,
        createdAt: new Date(createdAt), updatedAt: new Date(last),
        firstResponseDue: new Date(createdAt + frH * H), resolveDue: new Date(createdAt + rsH * H),
        firstResponseAt, resolvedAt, satisfaction,
        messages: { create: msgs },
      },
    });
  }
  console.log("seeded", await prisma.ticket.count(), "tickets,", await prisma.message.count(), "messages");
}

main().finally(() => prisma.$disconnect());
