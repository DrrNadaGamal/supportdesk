import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale-server";
import { t, pick } from "@/lib/i18n";
import { fmtDate, fmtNum } from "@/lib/format";
import ArticleBody from "@/components/ArticleBody";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const a = await prisma.article.findUnique({ where: { slug }, include: { category: true } });
  if (!a || !a.published) notFound();
  await prisma.article.update({ where: { id: a.id }, data: { views: { increment: 1 } } });
  const voted = (await cookies()).get(`sd_voted_${a.id}`)?.value;
  return (
    <div className="container narrow stack" style={{ gap: 18 }}>
      <Link href="/help" className="muted small">← {t(locale, "back_help")}</Link>
      <div>
        <span className="badge" style={{ background: a.category.color + "1f", color: a.category.color }}>{pick(locale, a.category, "name")}</span>
        <h1 style={{ marginTop: 10 }}>{pick(locale, a, "title")}</h1>
        <div className="muted small" style={{ marginTop: 6 }}>{t(locale, "last_updated")} {fmtDate(a.updatedAt, locale)} · {fmtNum(a.views, locale)} {t(locale, "views")} · {fmtNum(a.helpful, locale)} {t(locale, "helpful_n")}</div>
      </div>
      <div className="card card-pad"><ArticleBody text={pick(locale, a, "body")} /></div>
      <div className="card card-pad spread" style={{ flexWrap: "wrap" }}>
        {voted ? <span className="muted">{t(locale, "thanks_feedback")}</span> : (
          <>
            <strong>{t(locale, "was_helpful")}</strong>
            <form action="/api/act" method="post" className="row">
              <input type="hidden" name="intent" value="helpful" /><input type="hidden" name="articleId" value={a.id} />
              <button className="btn btn-ghost btn-sm" name="vote" value="yes">{t(locale, "yes")}</button>
              <button className="btn btn-ghost btn-sm" name="vote" value="no">{t(locale, "no")}</button>
            </form>
          </>
        )}
      </div>
      <div className="card card-pad spread" style={{ flexWrap: "wrap", background: "var(--accent-soft)", borderColor: "#d9dcff" }}>
        <strong>{t(locale, "still_need")}</strong>
        <Link href="/portal/new" className="btn btn-sm">{t(locale, "contact_us")}</Link>
      </div>
    </div>
  );
}
