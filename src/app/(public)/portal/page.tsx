import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import { ago } from "@/lib/format";
import { StatusBadge } from "@/components/Badges";
import Avatar from "@/components/Avatar";

export default async function Portal() {
  const locale = await getLocale();
  const me = await currentCustomer();
  if (!me) {
    const customers = await prisma.customer.findMany({ where: { company: { not: "-" } }, orderBy: { id: "asc" } });
    return (
      <div className="container narrow stack">
        <div><h1>{t(locale, "portal_signin_title")}</h1><p className="muted">{t(locale, "portal_signin_note")}</p></div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {customers.slice(0, 8).map((c) => (
            <form key={c.id} action="/api/act" method="post">
              <input type="hidden" name="intent" value="customer_login" /><input type="hidden" name="customerId" value={c.id} />
              <button className="card row" style={{ width: "100%", padding: "12px 14px", cursor: "pointer", textAlign: "start", font: "inherit", gap: 12 }}>
                <Avatar name={c.name} color="#64748b" />
                <span><div style={{ fontWeight: 650 }}>{c.name}</div><div className="muted small">{c.company}</div></span>
              </button>
            </form>
          ))}
        </div>
        <div><Link href="/portal/new" className="btn">{t(locale, "open_ticket")}</Link></div>
      </div>
    );
  }
  const tickets = await prisma.ticket.findMany({ where: { customerId: me.id }, orderBy: { updatedAt: "desc" } });
  return (
    <div className="container narrow stack">
      <div className="spread" style={{ flexWrap: "wrap" }}>
        <div><h1>{t(locale, "my_tickets")}</h1><p className="muted small" style={{ margin: "4px 0 0" }}>{me.name} · {me.email}</p></div>
        <div className="row"><Link href="/portal/new" className="btn">{t(locale, "new_ticket")}</Link>
          <form action="/api/act" method="post"><input type="hidden" name="intent" value="customer_logout" /><button className="btn btn-ghost">{t(locale, "sign_out")}</button></form></div>
      </div>
      <div className="card">
        {tickets.map((x) => (
          <Link key={x.id} href={`/portal/t/${x.number}`} className="spread" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", gap: 12 }}>
            <span style={{ minWidth: 0 }}><div style={{ fontWeight: 650 }} dir="auto">{x.subject}</div><div className="muted small">#{x.number} · {ago(x.updatedAt, locale)}</div></span>
            <StatusBadge status={x.status} locale={locale} />
          </Link>
        ))}
        {tickets.length === 0 && <div className="muted" style={{ padding: 28, textAlign: "center" }}>{t(locale, "portal_no_tickets")}</div>}
      </div>
    </div>
  );
}
