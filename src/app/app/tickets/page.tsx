import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t, pick, type Key } from "@/lib/i18n";
import { isBreached, STATUSES, PRIORITIES, nowMs } from "@/lib/sla";
import { ago, fmtNum } from "@/lib/format";
import { StatusBadge, PriorityBadge, SlaPill } from "@/components/Badges";
import Avatar from "@/components/Avatar";

type SP = { view?: string; status?: string; priority?: string; assignee?: string; q?: string };

export default async function Tickets({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const me = (await currentAgent())!;
  const [all, agents] = await Promise.all([
    prisma.ticket.findMany({ include: { customer: true, assignee: true, category: true }, orderBy: { updatedAt: "desc" } }),
    prisma.agent.findMany(),
  ]);
  const now = nowMs();
  const view = sp.view ?? "all";
  const isOpen = (x: (typeof all)[number]) => !["RESOLVED", "CLOSED"].includes(x.status);
  const q = (sp.q ?? "").trim().toLowerCase();

  let rows = all.filter((x) => {
    if (view === "mine" && x.assigneeId !== me.id) return false;
    if (view === "unassigned" && (x.assigneeId || !isOpen(x))) return false;
    if (view === "breached" && !isBreached(x, now)) return false;
    if (sp.status && x.status !== sp.status) return false;
    if (sp.priority && x.priority !== sp.priority) return false;
    if (sp.assignee === "none" ? !!x.assigneeId : sp.assignee && x.assigneeId !== sp.assignee) return false;
    if (q && !(`${x.subject} ${x.customer.name} ${x.customer.company} #${x.number}`.toLowerCase().includes(q))) return false;
    return true;
  });
  const total = rows.length;
  rows = rows.slice(0, 60);

  const counts = {
    all: all.filter(isOpen).length,
    mine: all.filter((x) => isOpen(x) && x.assigneeId === me.id).length,
    unassigned: all.filter((x) => isOpen(x) && !x.assigneeId).length,
    breached: all.filter((x) => isBreached(x, now)).length,
  };
  const tabs: Array<[string, Key]> = [["all", "view_all"], ["mine", "view_mine"], ["unassigned", "view_unassigned"], ["breached", "view_breached"]];
  const qs = (v: string) => `/app/tickets?view=${v}`;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="spread" style={{ flexWrap: "wrap" }}>
        <h1>{t(locale, "tickets_title")}</h1>
        <div className="tabs">
          {tabs.map(([k, label]) => (
            <Link key={k} href={qs(k)} className={`tab ${view === k ? "on" : ""}`}>
              {t(locale, label)} <span style={{ opacity: .7 }}>{fmtNum(counts[k as keyof typeof counts], locale)}</span>
            </Link>
          ))}
        </div>
      </div>

      <form className="card card-pad filters" method="get">
        <input type="hidden" name="view" value={view} />
        <label className="field">{t(locale, "search")}
          <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder={t(locale, "search_tickets")} />
        </label>
        <label className="field">{t(locale, "filter_status")}
          <select className="select" name="status" defaultValue={sp.status ?? ""}>
            <option value="">{t(locale, "all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(locale, `s_${s}` as Key)}</option>)}
          </select>
        </label>
        <label className="field">{t(locale, "filter_priority")}
          <select className="select" name="priority" defaultValue={sp.priority ?? ""}>
            <option value="">{t(locale, "all")}</option>
            {PRIORITIES.map((s) => <option key={s} value={s}>{t(locale, `p_${s}` as Key)}</option>)}
          </select>
        </label>
        <label className="field">{t(locale, "filter_assignee")}
          <select className="select" name="assignee" defaultValue={sp.assignee ?? ""}>
            <option value="">{t(locale, "all")}</option>
            <option value="none">{t(locale, "unassigned")}</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <div className="row"><button className="btn">{t(locale, "apply")}</button><Link href={qs(view)} className="btn btn-ghost">{t(locale, "clear")}</Link></div>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>{t(locale, "col_ticket")}</th>
                <th className="hide-sm">{t(locale, "col_customer")}</th>
                <th>{t(locale, "col_status")}</th>
                <th className="hide-sm">{t(locale, "col_priority")}</th>
                <th className="hide-sm">{t(locale, "col_assignee")}</th>
                <th>{t(locale, "col_sla")}</th>
                <th className="hide-sm">{t(locale, "col_updated")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td style={{ minWidth: 220 }}>
                    <Link href={`/app/tickets/${x.number}`} style={{ fontWeight: 650 }} dir="auto">{x.subject}</Link>
                    <div className="muted small">#{x.number} · {pick(locale, x.category, "name")} · {t(locale, `c_${x.channel}` as Key)}</div>
                  </td>
                  <td className="hide-sm"><div style={{ fontWeight: 550 }}><bdi>{x.customer.name}</bdi></div><div className="muted small"><bdi>{x.customer.company}</bdi></div></td>
                  <td><StatusBadge status={x.status} locale={locale} /></td>
                  <td className="hide-sm"><PriorityBadge priority={x.priority} locale={locale} /></td>
                  <td className="hide-sm">
                    {x.assignee ? (
                      <span className="row" style={{ gap: 8 }}><Avatar name={x.assignee.name} color={x.assignee.color} size="sm" />{x.assignee.name.split(" ")[0]}</span>
                    ) : (
                      <form action="/api/act" method="post" className="row">
                        <input type="hidden" name="intent" value="assign_me" /><input type="hidden" name="number" value={x.number} />
                        <button className="btn btn-ghost btn-sm">{t(locale, "assign_to_me")}</button>
                      </form>
                    )}
                  </td>
                  <td><SlaPill ticket={x} locale={locale} /></td>
                  <td className="muted small hide-sm" style={{ whiteSpace: "nowrap" }}>{ago(x.updatedAt, locale)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>{t(locale, "no_tickets")}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="muted small" style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>{fmtNum(total, locale)} {t(locale, "results")}</div>
      </div>
    </div>
  );
}
