import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t, pick } from "@/lib/i18n";
import { fmtNum, ago } from "@/lib/format";

export default async function KbAdmin() {
  const locale = await getLocale();
  const me = (await currentAgent())!;
  const articles = await prisma.article.findMany({ include: { category: true }, orderBy: { views: "desc" } });
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="spread" style={{ flexWrap: "wrap" }}>
        <h1>{t(locale, "kb_title")}</h1>
        {me.role === "ADMIN" ? <Link href="/app/kb/new" className="btn"><Plus size={16} />{t(locale, "kb_new")}</Link> : <span className="muted small">{t(locale, "admin_only")}</span>}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t(locale, "col_title")}</th><th className="hide-sm">{t(locale, "category")}</th><th>{t(locale, "col_views")}</th><th>{t(locale, "col_helpful")}</th><th className="hide-sm">{t(locale, "col_updated")}</th></tr></thead>
            <tbody>
              {articles.map((a) => {
                const tot = a.helpful + a.notHelpful;
                return (
                  <tr key={a.id}>
                    <td style={{ minWidth: 200 }}>
                      {me.role === "ADMIN" ? <Link href={`/app/kb/${a.id}`} style={{ fontWeight: 650 }}>{pick(locale, a, "title")}</Link> : <span style={{ fontWeight: 650 }}>{pick(locale, a, "title")}</span>}
                      {!a.published && <span className="badge b-ON_HOLD" style={{ marginInlineStart: 8 }}>{t(locale, "draft")}</span>}
                    </td>
                    <td className="hide-sm"><span className="badge" style={{ background: a.category.color + "1f", color: a.category.color }}>{pick(locale, a.category, "name")}</span></td>
                    <td>{fmtNum(a.views, locale)}</td>
                    <td>{tot ? `${fmtNum(Math.round((a.helpful / tot) * 100), locale)}%` : "-"}</td>
                    <td className="muted small hide-sm">{ago(a.updatedAt, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
