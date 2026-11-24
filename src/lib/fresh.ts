import { prisma } from "./prisma";

// The demo data is seeded at build time. So the dashboard never looks stale,
// every timestamp is shifted forward once per instance to match "now".
let done = false;
export async function ensureFresh() {
  if (done) return;
  done = true;
  try {
    const row = await prisma.meta.findUnique({ where: { key: "seededAt" } });
    if (!row) return;
    const delta = Date.now() - Number(row.value);
    if (delta < 3600_000) return;
    const tables: Array<[string, string[]]> = [
      ["Ticket", ["createdAt", "updatedAt", "firstResponseDue", "resolveDue", "firstResponseAt", "resolvedAt"]],
      ["Message", ["createdAt"]],
      ["Article", ["updatedAt"]],
    ];
    for (const [table, cols] of tables) {
      for (const c of cols) {
        await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "${c}" = "${c}" + ${Math.round(delta)} WHERE "${c}" IS NOT NULL`);
      }
    }
    await prisma.meta.update({ where: { key: "seededAt" }, data: { value: String(Date.now()) } });
  } catch (e) {
    console.error("ensureFresh failed", e);
  }
}
