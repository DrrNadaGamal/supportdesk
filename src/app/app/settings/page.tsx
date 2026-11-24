import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import { SLA_HOURS, PRIORITIES } from "@/lib/sla";
import { fmtNum } from "@/lib/format";
import { PriorityBadge } from "@/components/Badges";

export default async function Settings({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const sp = await searchParams;
  const me = await currentAgent();
  const locale = await getLocale();
  return (
    <div className="stack" style={{ gap: 18, maxWidth: 760 }}>
      <h1>{t(locale, "settings_title")}</h1>
      <div className="card">
        <div className="card-pad"><h2>{t(locale, "sla_policy")}</h2><p className="muted" style={{ marginBottom: 0 }}>{t(locale, "sla_note")}</p></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t(locale, "priority")}</th><th>{t(locale, "sla_first")}</th><th>{t(locale, "sla_resolution")}</th></tr></thead>
            <tbody>
              {PRIORITIES.map((p) => (
                <tr key={p}><td><PriorityBadge priority={p} locale={locale} /></td><td>{fmtNum(SLA_HOURS[p][0], locale)} {t(locale, "hours")}</td><td>{fmtNum(SLA_HOURS[p][1], locale)} {t(locale, "hours")}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card card-pad stack" style={{ gap: 10 }}>
        <h2>{locale === "ar" ? "بيانات العرض التجريبي" : "Demo data"}</h2>
        <p className="muted" style={{ margin: 0 }}>{locale === "ar"
          ? "يتشارك كل الزوار قاعدة بيانات واحدة، وتُعاد تلقائيًا إلى البيانات الأصلية كل ٦ ساعات. يمكن للمسؤول إعادتها الآن."
          : "All visitors share one demo database. It resets itself to the original seed data after 6 hours, and an admin can reset it now."}</p>
        {sp.reset && <div className="badge b-RESOLVED" style={{ alignSelf: "flex-start" }}>{locale === "ar" ? "تمت إعادة الضبط" : "Demo data reset"}</div>}
        {me?.role === "ADMIN" ? (
          <form action="/api/act" method="post"><input type="hidden" name="intent" value="reset_demo" /><button className="btn btn-danger">{locale === "ar" ? "إعادة ضبط بيانات العرض" : "Reset demo data"}</button></form>
        ) : <span className="muted small">{t(locale, "admin_only")}</span>}
      </div>
      <p className="muted small">{t(locale, "attribution")}</p>
    </div>
  );
}
