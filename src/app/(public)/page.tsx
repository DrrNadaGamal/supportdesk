import Link from "next/link";
import { Search, ArrowRight, UserCog, CreditCard, Bug, Plug, Lightbulb, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale-server";
import { t, pick } from "@/lib/i18n";
import { fmtNum } from "@/lib/format";

const icons: Record<string, React.ReactNode> = {
  billing: <CreditCard size={19} />, account: <UserCog size={19} />, bug: <Bug size={19} />,
  integrations: <Plug size={19} />, howto: <Lightbulb size={19} />, feature: <Sparkles size={19} />,
};

export default async function Landing() {
  const locale = await getLocale();
  const [cats, popular] = await Promise.all([
    prisma.category.findMany({ include: { _count: { select: { articles: { where: { published: true } } } } } }),
    prisma.article.findMany({ where: { published: true }, orderBy: { views: "desc" }, take: 6 }),
  ]);
  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bg" src="/hero.jpg" alt="" />
        <div className="in">
          <h1>{t(locale, "hero_title")}</h1>
          <p>{t(locale, "hero_sub")}</p>
          <form action="/help" method="get" className="searchbar">
            <input name="q" placeholder={t(locale, "search_placeholder")} aria-label={t(locale, "search")} />
            <button className="btn"><Search size={16} />{t(locale, "search")}</button>
          </form>
        </div>
      </section>
      <div className="container stack" style={{ gap: 36 }}>
        <section className="stack">
          <h2>{t(locale, "browse_cat")}</h2>
          <div className="grid grid-3">
            {cats.map((c) => (
              <Link key={c.id} href={`/help?cat=${c.slug}`} className="card cat-card">
                <span className="cat-ico" style={{ background: c.color }}>{icons[c.slug]}</span>
                <strong>{pick(locale, c, "name")}</strong>
                <span className="muted small">{fmtNum(c._count.articles, locale)} {t(locale, "articles_n")}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="stack">
          <h2>{t(locale, "popular")}</h2>
          <div className="card">
            {popular.map((a) => (
              <Link key={a.id} href={`/help/${a.slug}`} className="spread" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontWeight: 600 }}>{pick(locale, a, "title")}</span>
                <ArrowRight size={16} className="muted" style={locale === "ar" ? { transform: "scaleX(-1)" } : undefined} />
              </Link>
            ))}
          </div>
        </section>
        <section className="card card-pad spread" style={{ flexWrap: "wrap", background: "var(--accent-soft)", borderColor: "#d9dcff" }}>
          <div><h2>{t(locale, "still_need")}</h2><p className="muted" style={{ margin: "4px 0 0" }}>{t(locale, "hero_sub")}</p></div>
          <Link href="/portal/new" className="btn">{t(locale, "contact_us")}</Link>
        </section>
      </div>
    </>
  );
}
