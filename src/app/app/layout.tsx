import { redirect } from "next/navigation";
import { currentAgent } from "@/lib/session";
import { getLocale } from "@/lib/locale-server";
import { t } from "@/lib/i18n";
import { ensureFresh } from "@/lib/fresh";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureFresh();
  const agent = await currentAgent();
  if (!agent) redirect("/login");
  const locale = await getLocale();
  return (
    <div className="shell">
      <Sidebar locale={locale} name={agent.name} color={agent.color} role={agent.role} />
      <main className="main">
        {children}
        <p className="muted small footnote" style={{ textAlign: "center" }}>{t(locale, "footer_demo")}</p>
      </main>
    </div>
  );
}
