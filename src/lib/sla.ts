// SLA targets in hours: [first response, resolution]
export const SLA_HOURS: Record<string, [number, number]> = {
  URGENT: [1, 4],
  HIGH: [4, 24],
  NORMAL: [8, 48],
  LOW: [24, 72],
};

export const STATUSES = ["OPEN", "PENDING", "ON_HOLD", "RESOLVED", "CLOSED"] as const;
export const PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;

export function dueDates(priority: string, from = new Date()) {
  const [fr, rs] = SLA_HOURS[priority] ?? SLA_HOURS.NORMAL;
  return {
    firstResponseDue: new Date(from.getTime() + fr * 3600_000),
    resolveDue: new Date(from.getTime() + rs * 3600_000),
  };
}

export type SlaState = "ok" | "warn" | "breached" | "met" | "paused" | "none";

export interface SlaInfo {
  state: SlaState;
  /** ms until due (negative when overdue) */
  remaining: number | null;
  label: "first_response" | "resolution" | "done";
}

type T = {
  status: string;
  createdAt: Date;
  firstResponseDue: Date;
  resolveDue: Date;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
};

export function slaOf(t: T, now = Date.now()): SlaInfo {
  const finished = t.status === "RESOLVED" || t.status === "CLOSED";
  if (finished) {
    const at = t.resolvedAt?.getTime() ?? now;
    return { state: at > t.resolveDue.getTime() ? "breached" : "met", remaining: null, label: "done" };
  }
  // Waiting on the customer or on hold: the resolution clock is paused.
  if ((t.status === "PENDING" || t.status === "ON_HOLD") && t.firstResponseAt) {
    return { state: "paused", remaining: null, label: "resolution" };
  }
  const waitingOnFirst = !t.firstResponseAt;
  const due = (waitingOnFirst ? t.firstResponseDue : t.resolveDue).getTime();
  const total = due - t.createdAt.getTime();
  const remaining = due - now;
  let state: SlaState = "ok";
  if (remaining < 0) state = "breached";
  else if (remaining < total * 0.25) state = "warn";
  return { state, remaining, label: waitingOnFirst ? "first_response" : "resolution" };
}

export function isBreached(t: T, now = Date.now()) {
  if (t.status === "RESOLVED" || t.status === "CLOSED") return false;
  if ((t.status === "PENDING" || t.status === "ON_HOLD") && t.firstResponseAt) return false;
  if (!t.firstResponseAt && t.firstResponseDue.getTime() < now) return true;
  return t.resolveDue.getTime() < now;
}
export const nowMs = () => Date.now();
