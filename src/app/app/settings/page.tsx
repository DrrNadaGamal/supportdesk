import { getLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import { SLA_HOURS, PRIORITIES } from "@/lib/sla";
import { fmtNum } from "@/lib/format";
import { PriorityBadge } from "@/components/Badges";

export default async function Settings() {
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
      <p className="muted small">{t(locale, "attribution")}</p>
    </div>
  );
}
