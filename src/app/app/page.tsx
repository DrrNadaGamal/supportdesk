import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t, pick } from "@/lib/i18n";
import { isBreached, nowMs } from "@/lib/sla";
import { fmtNum, fmtDuration, ago } from "@/lib/format";
import { PriorityBadge, SlaPill, Stars } from "@/components/Badges";
import Avatar from "@/components/Avatar";

const DAY = 86400_000;

export default async function Dashboard() {
  const locale = await getLocale();
  const me = (await currentAgent())!;
  const [tickets, agents] = await Promise.all([
    prisma.ticket.findMany({ include: { category: true, assignee: true, customer: true } }),
    prisma.agent.findMany(),
  ]);
  const now = nowMs();
  const open = tickets.filter((x) => !["RESOLVED", "CLOSED"].includes(x.status));
  const unassigned = open.filter((x) => !x.assigneeId);
  const atRisk = open.filter((x) => isBreached(x, now));
  const frts = tickets.filter((x) => x.firstResponseAt && now - x.createdAt.getTime() < 30 * DAY).map((x) => x.firstResponseAt!.getTime() - x.createdAt.getTime());
  const avgFrt = frts.length ? frts.reduce((a, b) => a + b, 0) / frts.length : 0;
  const rated = tickets.filter((x) => x.satisfaction);
  const csat = rated.length ? rated.reduce((a, x) => a + (x.satisfaction ?? 0), 0) / rated.length : 0;
  const resolved7 = tickets.filter((x) => x.resolvedAt && now - x.resolvedAt.getTime() < 7 * DAY).length;

  const days = Array.from({ length: 14 }, (_, i) => ({ i: 13 - i, created: 0, resolved: 0 }));
  for (const x of tickets) {
    const c = Math.floor((now - x.createdAt.getTime()) / DAY);
    if (c >= 0 && c < 14) days[13 - c].created++;
    if (x.resolvedAt) {
      const r = Math.floor((now - x.resolvedAt.getTime()) / DAY);
      if (r >= 0 && r < 14) days[13 - r].resolved++;
    }
  }
  const maxV = Math.max(4, ...days.map((d) => Math.max(d.created, d.resolved)));
  const W = 700, Hh = 200, padB = 24, bw = 12, gap = W / 14;

  const byCat = new Map<string, { name: string; color: string; n: number }>();
  for (const x of open) {
    const k = x.categoryId;
    const e = byCat.get(k) ?? { name: pick(locale, x.category, "name"), color: x.category.color, n: 0 };
    e.n++; byCat.set(k, e);
  }
  const cats = [...byCat.values()].sort((a, b) => b.n - a.n);
  const maxCat = Math.max(1, ...cats.map((c) => c.n));

  const load = agents.map((a) => ({ a, open: open.filter((x) => x.assigneeId === a.id).length })).sort((x, y) => y.open - x.open);
  const maxLoad = Math.max(1, ...load.map((l) => l.open));
  const attention = [...atRisk].sort((x, y) => (x.firstResponseAt ? x.resolveDue : x.firstResponseDue).getTime() - (y.firstResponseAt ? y.resolveDue : y.firstResponseDue).getTime()).slice(0, 6);

  const kpis = [
    { l: t(locale, "kpi_open"), v: fmtNum(open.length, locale) },
    { l: t(locale, "kpi_unassigned"), v: fmtNum(unassigned.length, locale), s: unassigned.length ? "!" : "" },
    { l: t(locale, "kpi_breached"), v: fmtNum(atRisk.length, locale), red: atRisk.length > 0 },
    { l: t(locale, "kpi_frt"), v: frts.length ? fmtDuration(avgFrt, locale) : "-" },
    { l: t(locale, "kpi_csat"), v: rated.length ? fmtNum(csat, locale, 1) : "-", s: rated.length ? t(locale, "csat_of") : t(locale, "no_ratings") },
    { l: t(locale, "kpi_resolved"), v: fmtNum(resolved7, locale) },
  ];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h1>{t(locale, "dash_title")}</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>{t(locale, "dash_hello")}{locale === "ar" ? "،" : ","} {me.name.split(" ")[0]}.</p>
      </div>
      <div className="grid grid-kpi">
        {kpis.map((k) => (
          <div key={k.l} className="card kpi">
            <div className="l">{k.l}</div>
            <div className="v" style={k.red ? { color: "var(--red)" } : undefined}>{k.v}</div>
            {k.s && k.s !== "!" ? <div className="s">{k.s}</div> : null}
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card card-pad stack" style={{ gap: 12 }}>
          <div className="spread" style={{ flexWrap: "wrap" }}>
            <h2>{t(locale, "chart_volume")}</h2>
            <div className="chart-legend">
              <span><i style={{ background: "#6366f1" }} />{t(locale, "created")}</span>
              <span><i style={{ background: "#22c55e" }} />{t(locale, "resolved")}</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${Hh + padB}`} width="100%" role="img" aria-label={t(locale, "chart_volume")} style={{ direction: "ltr" }}>
            {[0, 0.5, 1].map((g) => (
              <g key={g}>
                <line x1="0" x2={W} y1={Hh - g * (Hh - 14)} y2={Hh - g * (Hh - 14)} stroke="#e8ebf3" />
                <text x="0" y={Hh - g * (Hh - 14) - 4} fontSize="10" fill="#8a93ad">{fmtNum(Math.round(maxV * g), locale)}</text>
              </g>
            ))}
            {days.map((d, idx) => {
              const x = idx * gap + gap / 2;
              const hc = (d.created / maxV) * (Hh - 14);
              const hr = (d.resolved / maxV) * (Hh - 14);
              return (
                <g key={idx}>
                  <rect x={x - bw - 1} y={Hh - hc} width={bw} height={hc} rx="3" fill="#6366f1" />
                  <rect x={x + 1} y={Hh - hr} width={bw} height={hr} rx="3" fill="#22c55e" />
                  <text x={x} y={Hh + 16} fontSize="10" textAnchor="middle" fill="#8a93ad">{idx % 2 === 1 ? fmtNum(d.i === 0 ? 0 : d.i, locale) + (locale === "ar" ? "ي" : "d") : ""}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="card card-pad stack" style={{ gap: 14 }}>
          <h2>{t(locale, "by_category")}</h2>
          {cats.map((c) => (
            <div key={c.name} className="stack" style={{ gap: 6 }}>
              <div className="spread small"><span style={{ fontWeight: 600 }}>{c.name}</span><span className="muted">{fmtNum(c.n, locale)}</span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.n / maxCat) * 100}%`, background: c.color }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="spread card-pad" style={{ paddingBottom: 10 }}>
            <h2>{t(locale, "needs_attention")}</h2>
            <Link href="/app/tickets?view=breached" className="small" style={{ color: "var(--accent)", fontWeight: 600 }}>{t(locale, "see_all")}</Link>
          </div>
          <div className="table-wrap">
            <table className="t">
              <tbody>
                {attention.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/app/tickets/${x.number}`} style={{ fontWeight: 650 }} dir="auto">{x.subject}</Link>
                      <div className="muted small">#{x.number} · <bdi>{x.customer.name}</bdi> · {ago(x.createdAt, locale)}</div>
                    </td>
                    <td className="hide-sm"><PriorityBadge priority={x.priority} locale={locale} /></td>
                    <td><SlaPill ticket={x} locale={locale} /></td>
                  </tr>
                ))}
                {attention.length === 0 && <tr><td className="muted">-</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card card-pad stack" style={{ gap: 14 }}>
          <h2>{t(locale, "leaderboard")}</h2>
          {load.map(({ a, open: n }) => (
            <div key={a.id} className="row" style={{ gap: 12 }}>
              <Avatar name={a.name} color={a.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="spread small"><span style={{ fontWeight: 600 }}>{a.name}</span><span className="muted">{fmtNum(n, locale)} {t(locale, "assigned_open")}</span></div>
                <div className="bar-track" style={{ marginTop: 6 }}><div className="bar-fill" style={{ width: `${(n / maxLoad) * 100}%`, background: a.color }} /></div>
              </div>
            </div>
          ))}
          {rated.length > 0 && <div className="row small muted" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}><Stars value={Math.round(csat)} /><span>{fmtNum(csat, locale, 1)} {t(locale, "csat_of")}</span></div>}
        </div>
      </div>
    </div>
  );
}
