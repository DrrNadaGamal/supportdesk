import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t, pick, type Key } from "@/lib/i18n";
import { PRIORITIES } from "@/lib/sla";

export default async function NewTicket({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const me = await currentCustomer();
  const cats = await prisma.category.findMany();
  return (
    <div className="container narrow stack">
      <h1>{t(locale, "new_ticket")}</h1>
      {sp.error && <div className="card card-pad" style={{ background: "#fde8e8", borderColor: "#f3c6c6", color: "#a11" }}>{locale === "ar" ? "تحقق من الحقول وحاول مرة أخرى." : "Please check the fields and try again."}</div>}
      <form action="/api/act" method="post" className="card card-pad stack">
        <input type="hidden" name="intent" value="ticket_create" />
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <label className="field">{t(locale, "your_name")}<input className="input" name="name" required defaultValue={me?.name} /></label>
          <label className="field">{t(locale, "your_email")}<input className="input" type="email" name="email" required defaultValue={me?.email} /></label>
        </div>
        <label className="field">{t(locale, "subject")}<input className="input" name="subject" required maxLength={160} /></label>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <label className="field">{t(locale, "category")}
            <select className="select" name="categoryId">{cats.map((c) => <option key={c.id} value={c.id}>{pick(locale, c, "name")}</option>)}</select>
          </label>
          <label className="field">{t(locale, "priority")}
            <select className="select" name="priority" defaultValue="NORMAL">{[...PRIORITIES].reverse().map((p) => <option key={p} value={p}>{t(locale, `p_${p}` as Key)}</option>)}</select>
          </label>
        </div>
        <label className="field">{t(locale, "message")}<textarea className="textarea" name="body" required placeholder={t(locale, "describe")} /></label>
        <div><button className="btn">{t(locale, "submit_ticket")}</button></div>
      </form>
    </div>
  );
}
