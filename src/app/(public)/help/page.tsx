import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale-server";
import { t, pick } from "@/lib/i18n";

export default async function Help({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const { q = "", cat } = await searchParams;
  const locale = await getLocale();
  const [cats, all] = await Promise.all([
    prisma.category.findMany(),
    prisma.article.findMany({ where: { published: true }, include: { category: true }, orderBy: { views: "desc" } }),
  ]);
  const needle = q.trim().toLowerCase();
  const list = all.filter((a) => (!cat || a.category.slug === cat) && (!needle || `${a.titleEn} ${a.titleAr} ${a.bodyEn} ${a.bodyAr}`.toLowerCase().includes(needle)));
  return (
    <div className="container stack narrow" style={{ gap: 20 }}>
      <h1>{t(locale, "nav_kb")}</h1>
      <form method="get" className="searchbar" style={{ boxShadow: "none", border: "1px solid var(--border)", background: "#fff", maxWidth: "none" }}>
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input name="q" defaultValue={q} placeholder={t(locale, "search_placeholder")} aria-label={t(locale, "search")} />
        <button className="btn"><Search size={16} />{t(locale, "search")}</button>
      </form>
      <div className="tabs">
        <Link href="/help" className={`tab ${!cat ? "on" : ""}`}>{t(locale, "all")}</Link>
        {cats.map((c) => <Link key={c.id} href={`/help?cat=${c.slug}`} className={`tab ${cat === c.slug ? "on" : ""}`}>{pick(locale, c, "name")}</Link>)}
      </div>
      <div className="card">
        {list.map((a) => (
          <Link key={a.id} href={`/help/${a.slug}`} style={{ display: "block", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 650 }}>{pick(locale, a, "title")}</div>
            <div className="muted small" style={{ marginTop: 2 }}>{pick(locale, a.category, "name")} · {pick(locale, a, "body").split("\n")[0].slice(0, 110)}</div>
          </Link>
        ))}
        {list.length === 0 && <div className="muted" style={{ padding: 28, textAlign: "center" }}>{t(locale, "no_results")}</div>}
      </div>
    </div>
  );
}
