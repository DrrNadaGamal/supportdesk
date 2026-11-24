import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/format";
import { StatusBadge, Stars } from "@/components/Badges";
import Avatar from "@/components/Avatar";

export default async function PortalTicket({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ created?: string }> }) {
  const { number } = await params;
  const sp = await searchParams;
  const locale = await getLocale();
  const me = await currentCustomer();
  if (!me) redirect("/portal");
  const ticket = await prisma.ticket.findUnique({
    where: { number: Number(number) },
    include: { messages: { where: { internal: false }, orderBy: { createdAt: "asc" }, include: { agent: true, customer: true } } },
  });
  if (!ticket || ticket.customerId !== me.id) notFound();
  const done = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  return (
    <div className="container narrow stack">
      <Link href="/portal" className="muted small">← {t(locale, "my_tickets")}</Link>
      {sp.created && (
        <div className="card card-pad" style={{ background: "#e2f6e9", borderColor: "#b5e4c4" }}>
          <strong>{t(locale, "ticket_created")} #{ticket.number}</strong><div className="small" style={{ marginTop: 2 }}>{t(locale, "ticket_created_note")}</div>
        </div>
      )}
      <div className="row-wrap" style={{ gap: 12 }}>
        <h1 dir="auto" style={{ flex: "1 1 280px" }}>{ticket.subject}</h1><StatusBadge status={ticket.status} locale={locale} />
      </div>
      <div className="muted small">#{ticket.number} · {fmtDateTime(ticket.createdAt, locale)}</div>
      <div className="card">
        {ticket.messages.map((m) => {
          const agent = m.authorType === "AGENT";
          const name = agent ? m.agent?.name ?? t(locale, "support_team") : me.name;
          return (
            <div key={m.id} className={`msg ${agent ? "agent" : "cust"}`}>
              <Avatar name={name} color={agent ? m.agent?.color : "#64748b"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-wrap small" style={{ gap: 8 }}><strong style={{ fontSize: 14 }}>{agent ? `${name} · ${t(locale, "support_team")}` : t(locale, "you")}</strong><span className="muted">{fmtDateTime(m.createdAt, locale)}</span></div>
                <div className="body" dir="auto">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      {ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? (
        <div className="card card-pad stack" style={{ gap: 10 }}>
          {ticket.satisfaction ? (
            <div className="row"><span>{t(locale, "rated")}</span><Stars value={ticket.satisfaction} /></div>
          ) : (
            <>
              <div><strong>{t(locale, "rate_title")}</strong><div className="muted small">{t(locale, "rate_sub")}</div></div>
              <form action="/api/act" method="post" className="row" style={{ gap: 6 }}>
                <input type="hidden" name="intent" value="rate" /><input type="hidden" name="number" value={ticket.number} />
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} name="score" value={n} className="btn btn-ghost" style={{ padding: "8px 12px", color: "#f59e0b" }} aria-label={`${n}`}><Star size={18} fill="currentColor" /> <span style={{ color: "var(--text)" }}>{n}</span></button>
                ))}
              </form>
            </>
          )}
        </div>
      ) : null}
      <form action="/api/act" method="post" className="card card-pad stack" style={{ gap: 12 }}>
        <input type="hidden" name="intent" value="customer_reply" /><input type="hidden" name="number" value={ticket.number} />
        <label className="field">{t(locale, "your_reply")}<textarea className="textarea" name="body" required /></label>
        {done && <div className="muted small">{t(locale, "reopen_note")}</div>}
        <div><button className="btn">{t(locale, "send_reply")}</button></div>
      </form>
    </div>
  );
}
