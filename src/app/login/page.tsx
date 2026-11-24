import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import LangToggle from "@/components/LangToggle";
import { ensureFresh } from "@/lib/fresh";
import Link from "next/link";

export default async function LoginPage() {
  await ensureFresh();
  if (await currentAgent()) redirect("/app");
  const locale = await getLocale();
  const agents = await prisma.agent.findMany({ orderBy: { id: "asc" } });
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div className="card card-pad stack" style={{ width: "100%", maxWidth: 480, gap: 18 }}>
        <div className="spread"><Logo name={t(locale, "appName")} /><LangToggle locale={locale} /></div>
        <div>
          <h1 style={{ fontSize: 22 }}>{t(locale, "login_title")}</h1>
          <p className="muted" style={{ marginBottom: 0 }}>{t(locale, "login_note")}</p>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {agents.map((a) => (
            <form key={a.id} action="/api/act" method="post">
              <input type="hidden" name="intent" value="agent_login" />
              <input type="hidden" name="agentId" value={a.id} />
              <button className="card row" style={{ width: "100%", padding: "12px 14px", cursor: "pointer", textAlign: "start", gap: 12, font: "inherit" }}>
                <Avatar name={a.name} color={a.color} size="lg" />
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 650 }}>{a.name}</div>
                  <div className="muted small">{locale === "ar" ? a.titleAr : a.title}</div>
                </span>
                <span className={`badge ${a.role === "ADMIN" ? "b-NORMAL" : "b-LOW"}`}>{t(locale, a.role === "ADMIN" ? "role_ADMIN" : "role_AGENT")}</span>
              </button>
            </form>
          ))}
        </div>
        <Link href="/" className="muted small">← {t(locale, "nav_portal")}</Link>
        <p className="muted small" style={{ margin: 0 }}>{t(locale, "attribution")}</p>
      </div>
    </div>
  );
}
