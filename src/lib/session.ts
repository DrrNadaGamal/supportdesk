import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const AGENT_COOKIE = "sd_agent";
export const CUSTOMER_COOKIE = "sd_customer";

export async function currentAgent() {
  const store = await cookies();
  const id = store.get(AGENT_COOKIE)?.value;
  if (!id) return null;
  return prisma.agent.findUnique({ where: { id } });
}

export async function currentCustomer() {
  const store = await cookies();
  const id = store.get(CUSTOMER_COOKIE)?.value;
  if (!id) return null;
  return prisma.customer.findUnique({ where: { id } });
}
