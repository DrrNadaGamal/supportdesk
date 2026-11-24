import { nowMs } from "@/lib/sla";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale-server";
import { t, type Key } from "@/lib/i18n";
import { fmtNum, fmtDuration } from "@/lib/format";
import Avatar from "@/components/Avatar";
import { Stars } from "@/components/Badges";

export default async function Team() {
  const locale = await getLocale();
  const [agents, tickets] = await Promise.all([prisma.agent.findMany(), prisma.ticket.findMany()]);
  const now = nowMs();
  const D30 = 30 * 86400_000;
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div><h1>{t(locale, "team_title")}</h1><p className="muted" style={{ margin: "4px 0 0" }}>{t(locale, "team_sub")}</p></div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {agents.map((a) => {
          const mine = tickets.filter((x) => x.assigneeId === a.id);
          const open = mine.filter((x) => !["RESOLVED", "CLOSED"].includes(x.status)).length;
          const res = mine.filter((x) => x.resolvedAt && now - x.resolvedAt.getTime() < D30).length;
          const frts = mine.filter((x) => x.firstResponseAt).map((x) => x.firstResponseAt!.getTime() - x.createdAt.getTime());
          const rated = mine.filter((x) => x.satisfaction);
          const avg = rated.length ? rated.reduce((s, x) => s + (x.satisfaction ?? 0), 0) / rated.length : 0;
          return (
            <div key={a.id} className="card card-pad stack" style={{ gap: 14 }}>
              <div className="row"><Avatar name={a.name} color={a.color} size="lg" />
                <div><div style={{ fontWeight: 700 }}>{a.name}</div><div className="muted small">{locale === "ar" ? a.titleAr : a.title}</div></div>
                <span className={`badge ${a.role === "ADMIN" ? "b-NORMAL" : "b-LOW"}`} style={{ marginInlineStart: "auto" }}>{t(locale, `role_${a.role}` as Key)}</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><div className="muted small">{t(locale, "open_now")}</div><div style={{ fontSize: 22, fontWeight: 750 }}>{fmtNum(open, locale)}</div></div>
                <div><div className="muted small">{t(locale, "resolved_30")}</div><div style={{ fontSize: 22, fontWeight: 750 }}>{fmtNum(res, locale)}</div></div>
                <div><div className="muted small">{t(locale, "kpi_frt")}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{frts.length ? fmtDuration(frts.reduce((x, y) => x + y, 0) / frts.length, locale) : "-"}</div></div>
                <div><div className="muted small">{t(locale, "avg_rating")}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{rated.length ? <span className="row" style={{ gap: 6 }}>{fmtNum(avg, locale, 1)} <Stars value={Math.round(avg)} /></span> : "-"}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
