import { prisma } from "@/lib/prisma";
import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t, pick } from "@/lib/i18n";

export default async function Canned() {
  const locale = await getLocale();
  const me = (await currentAgent())!;
  const list = await prisma.cannedReply.findMany({ orderBy: { id: "asc" } });
  const admin = me.role === "ADMIN";
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div><h1>{t(locale, "canned_title")}</h1><p className="muted" style={{ margin: "4px 0 0" }}>{t(locale, "canned_hint")}</p></div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {list.map((c) => (
          <div key={c.id} className="card card-pad stack" style={{ gap: 10 }}>
            <div className="spread"><h2>{pick(locale, c, "title")}</h2>
              {admin && <form action="/api/act" method="post"><input type="hidden" name="intent" value="canned_delete" /><input type="hidden" name="id" value={c.id} /><button className="btn btn-danger btn-sm">{t(locale, "delete")}</button></form>}
            </div>
            <div className="muted" style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{pick(locale, c, "body")}</div>
          </div>
        ))}
      </div>
      {admin ? (
        <form action="/api/act" method="post" className="card card-pad stack" style={{ maxWidth: 760 }}>
          <h2>{t(locale, "canned_new")}</h2>
          <input type="hidden" name="intent" value="canned_save" />
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <label className="field">{t(locale, "article_title_en")}<input className="input" name="titleEn" required /></label>
            <label className="field">{t(locale, "article_title_ar")}<input className="input" name="titleAr" dir="rtl" /></label>
            <label className="field">{t(locale, "article_body_en")}<textarea className="textarea" name="bodyEn" required /></label>
            <label className="field">{t(locale, "article_body_ar")}<textarea className="textarea" name="bodyAr" dir="rtl" /></label>
          </div>
          <div><button className="btn">{t(locale, "save")}</button></div>
        </form>
      ) : <p className="muted small">{t(locale, "admin_only")}</p>}
    </div>
  );
}
