import Link from "next/link";
import { getLocale } from "@/lib/locale-server";
import { currentCustomer } from "@/lib/session";
import { t } from "@/lib/i18n";
import { ensureFresh } from "@/lib/fresh";
import Logo from "@/components/Logo";
import LangToggle from "@/components/LangToggle";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  await ensureFresh();
  const locale = await getLocale();
  const customer = await currentCustomer();
  return (
    <>
      <header className="pub-head">
        <div className="in">
          <Link href="/"><Logo name={t(locale, "appName")} /></Link>
          <nav className="pub-nav">
            <Link className="link" href="/help">{t(locale, "nav_kb")}</Link>
            <Link className="link" href="/portal">{t(locale, "my_tickets")}</Link>
            <Link className="link" href="/login">{t(locale, "agent_login")}</Link>
            <LangToggle locale={locale} />
            <Link className="btn btn-sm" href="/portal/new">{t(locale, "open_ticket")}</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="foot">
        <div>{t(locale, "attribution")}</div>
        <div>{t(locale, "footer_demo")}</div>
        {customer && <div style={{ marginTop: 6 }}>{customer.email}</div>}
      </footer>
    </>
  );
}
