import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t, pick } from "@/lib/i18n";

export default async function ArticleEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = (await currentAgent())!;
  if (me.role !== "ADMIN") redirect("/app/kb");
  const locale = await getLocale();
  const cats = await prisma.category.findMany();
  const a = id === "new" ? null : await prisma.article.findUnique({ where: { id } });
  if (id !== "new" && !a) notFound();
  return (
    <div className="stack narrow" style={{ gap: 18, maxWidth: 860 }}>
      <Link href="/app/kb" className="muted small">← {t(locale, "kb_title")}</Link>
      <h1>{a ? t(locale, "kb_edit") : t(locale, "kb_new")}</h1>
      <form action="/api/act" method="post" className="card card-pad stack">
        <input type="hidden" name="id" value={a?.id ?? ""} />
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <label className="field">{t(locale, "article_title_en")}<input className="input" name="titleEn" required defaultValue={a?.titleEn} /></label>
          <label className="field">{t(locale, "article_title_ar")}<input className="input" name="titleAr" dir="rtl" defaultValue={a?.titleAr} /></label>
        </div>
        <label className="field">{t(locale, "category")}
          <select className="select" name="categoryId" defaultValue={a?.categoryId}>{cats.map((c) => <option key={c.id} value={c.id}>{pick(locale, c, "name")}</option>)}</select>
        </label>
        <label className="field">{t(locale, "article_body_en")}<textarea className="textarea" style={{ minHeight: 200 }} name="bodyEn" required defaultValue={a?.bodyEn} /></label>
        <label className="field">{t(locale, "article_body_ar")}<textarea className="textarea" style={{ minHeight: 200 }} dir="rtl" name="bodyAr" defaultValue={a?.bodyAr} /></label>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" name="published" value="1" defaultChecked={a ? a.published : true} /> {t(locale, "published")}</label>
        <div className="spread">
          <button className="btn" name="intent" value="article_save">{t(locale, "save")}</button>
          {a && (
            <button className="btn btn-danger" name="intent" value="article_delete" formNoValidate>{t(locale, "delete")}</button>
          )}
        </div>
      </form>
    </div>
  );
}
