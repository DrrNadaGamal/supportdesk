import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t, pick, type Key } from "@/lib/i18n";
import { STATUSES, PRIORITIES, SLA_HOURS, nowMs } from "@/lib/sla";
import { fmtDateTime, fmtDuration, fmtNum } from "@/lib/format";
import { StatusBadge, PriorityBadge, SlaPill, Stars } from "@/components/Badges";
import Avatar from "@/components/Avatar";
import ReplyBox from "@/components/ReplyBox";

export default async function TicketPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const locale = await getLocale();
  const me = (await currentAgent())!;
  const ticket = await prisma.ticket.findUnique({
    where: { number: Number(number) },
    include: { customer: true, assignee: true, category: true, messages: { orderBy: { createdAt: "asc" }, include: { agent: true, customer: true } } },
  });
  if (!ticket) notFound();
  const [agents, cats, canned, others] = await Promise.all([
    prisma.agent.findMany(),
    prisma.category.findMany(),
    prisma.cannedReply.findMany(),
    prisma.ticket.findMany({ where: { customerId: ticket.customerId, NOT: { id: ticket.id } }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);
  const [frH, rsH] = SLA_HOURS[ticket.priority];


  const slaRow = (label: string, due: Date, doneAt: Date | null) => {
    const late = (doneAt?.getTime() ?? nowMs()) > due.getTime();
    return (
      <div className="spread small">
        <span>{label}</span>
        <span style={{ color: doneAt ? (late ? "var(--red)" : "var(--green)") : late ? "var(--red)" : "var(--muted)", fontWeight: 600 }}>
          {doneAt ? `${late ? t(locale, "sla_breached") : t(locale, "sla_met")}` : `${late ? t(locale, "overdue_by") : t(locale, "due_in")} ${fmtDuration(due.getTime() - nowMs(), locale)}`}
        </span>
      </div>
    );
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <Link href="/app/tickets" className="muted small">← {t(locale, "tickets_title")}</Link>
        <div className="row-wrap" style={{ marginTop: 6, gap: 12 }}>
          <h1 dir="auto" style={{ flex: "1 1 320px" }}>{ticket.subject}</h1>
          <StatusBadge status={ticket.status} locale={locale} />
          <PriorityBadge priority={ticket.priority} locale={locale} />
        </div>
        <div className="muted small" style={{ marginTop: 6 }}>#{ticket.number} · {t(locale, "via")} {t(locale, `c_${ticket.channel}` as Key)} · {fmtDateTime(ticket.createdAt, locale)}</div>
      </div>

      <div className="grid grid-ticket">
        <div className="stack">
          <div className="card">
            {ticket.messages.map((m) => {
              const isAgent = m.authorType === "AGENT";
              const name = isAgent ? m.agent?.name ?? "" : m.customer?.name ?? ticket.customer.name;
              return (
                <div key={m.id} className={`msg ${m.internal ? "note" : isAgent ? "agent" : "cust"}`}>
                  <Avatar name={name} color={isAgent ? m.agent?.color : "#64748b"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-wrap small" style={{ gap: 8 }}>
                      <strong style={{ fontSize: 14 }}>{name}</strong>
                      {m.internal && <span className="note-tag">{t(locale, "internal_note")}</span>}
                      {!isAgent && <span className="muted">{t(locale, "customer_label")}</span>}
                      <span className="muted">{fmtDateTime(m.createdAt, locale)}</span>
                    </div>
                    <div className="body" dir="auto">{m.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <ReplyBox
            number={ticket.number}
            agentName={me.name}
            customerName={ticket.customer.name}
            placeholder={t(locale, "describe").length ? (locale === "ar" ? "اكتب ردك هنا..." : "Write your reply...") : ""}
            canned={canned.map((c) => ({ id: c.id, title: pick(locale, c, "title"), body: pick(locale, c, "body") }))}
            labels={{ reply: t(locale, "reply"), note: t(locale, "internal_note"), send: t(locale, "send"), sendResolve: t(locale, "send_and_resolve"), pick: t(locale, "pick_canned"), insert: t(locale, "insert_canned"), internalBadge: t(locale, "internal_badge") }}
          />
        </div>

        <div className="stack">
          <form action="/api/act" method="post" className="card card-pad stack" style={{ gap: 12 }}>
            <h2>{t(locale, "details")}</h2>
            <input type="hidden" name="intent" value="ticket_update" />
            <input type="hidden" name="number" value={ticket.number} />
            <label className="field">{t(locale, "filter_status")}
              <select className="select" name="status" defaultValue={ticket.status}>
                {STATUSES.map((s) => <option key={s} value={s}>{t(locale, `s_${s}` as Key)}</option>)}
              </select>
            </label>
            <label className="field">{t(locale, "priority")}
              <select className="select" name="priority" defaultValue={ticket.priority}>
                {PRIORITIES.map((s) => <option key={s} value={s}>{t(locale, `p_${s}` as Key)}</option>)}
              </select>
            </label>
            <label className="field">{t(locale, "filter_assignee")}
              <select className="select" name="assigneeId" defaultValue={ticket.assigneeId ?? ""}>
                <option value="">{t(locale, "unassigned")}</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label className="field">{t(locale, "category")}
              <select className="select" name="categoryId" defaultValue={ticket.categoryId}>
                {cats.map((c) => <option key={c.id} value={c.id}>{pick(locale, c, "name")}</option>)}
              </select>
            </label>
            <button className="btn">{t(locale, "update")}</button>
          </form>

          <div className="card card-pad stack" style={{ gap: 10 }}>
            <div className="spread"><h2>SLA</h2><SlaPill ticket={ticket} locale={locale} /></div>
            {slaRow(`${t(locale, "sla_first")} (${fmtNum(frH, locale)}${t(locale, "hours")})`, ticket.firstResponseDue, ticket.firstResponseAt)}
            {slaRow(`${t(locale, "sla_resolution")} (${fmtNum(rsH, locale)}${t(locale, "hours")})`, ticket.resolveDue, ticket.resolvedAt)}
            {ticket.satisfaction ? <div className="spread small"><span>{t(locale, "satisfaction")}</span><Stars value={ticket.satisfaction} /></div> : null}
          </div>

          <div className="card card-pad stack" style={{ gap: 12 }}>
            <h2>{t(locale, "customer")}</h2>
            <div className="row"><Avatar name={ticket.customer.name} color="#64748b" size="lg" /><div><div style={{ fontWeight: 650 }}>{ticket.customer.name}</div><div className="muted small">{ticket.customer.email}</div></div></div>
            <dl className="kv" style={{ margin: 0 }}>
              <dt>{t(locale, "company")}</dt><dd>{ticket.customer.company}</dd>
              <dt>{t(locale, "plan")}</dt><dd>{ticket.customer.plan}</dd>
              <dt>{t(locale, "tags")}</dt><dd className="row-wrap" style={{ gap: 6 }}>{ticket.tags.split(",").filter(Boolean).map((g) => <span key={g} className="badge b-LOW">{g}</span>)}</dd>
            </dl>
            {others.length > 0 && (
              <div className="stack" style={{ gap: 8, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div className="muted small" style={{ fontWeight: 650 }}>{t(locale, "other_tickets")}</div>
                {others.map((o) => (
                  <Link key={o.id} href={`/app/tickets/${o.number}`} className="spread small" style={{ gap: 8 }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{o.number} {o.subject}</span>
                    <StatusBadge status={o.status} locale={locale} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
