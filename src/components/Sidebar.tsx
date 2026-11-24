import Link from "next/link";
import { LogOut, ExternalLink } from "lucide-react";
import { t, type Locale, type Key } from "@/lib/i18n";
import Logo from "./Logo";
import Avatar from "./Avatar";
import LangToggle from "./LangToggle";
import NavLinks from "./NavLinks";

const items: Array<{ href: string; key: Key; icon: string }> = [
  { href: "/app", key: "nav_dashboard", icon: "dash" },
  { href: "/app/tickets", key: "nav_tickets", icon: "inbox" },
  { href: "/app/kb", key: "nav_kb", icon: "kb" },
  { href: "/app/canned", key: "nav_canned", icon: "canned" },
  { href: "/app/team", key: "nav_team", icon: "team" },
  { href: "/app/settings", key: "nav_settings", icon: "settings" },
];

export default function Sidebar({ locale, name, color, role }: { locale: Locale; name: string; color: string; role: string }) {
  return (
    <aside className="side">
      <div className="brand"><Logo name={t(locale, "appName")} dark /></div>
      <NavLinks items={items.map((i) => ({ ...i, label: t(locale, i.key) }))} />
      <div className="side-foot">
        <div className="row who" style={{ gap: 10 }}>
          <Avatar name={name} color={color} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 650 }}>{name}</div>
            <div className="small" style={{ color: "#8c94b8" }}>{t(locale, `role_${role}` as Key)}</div>
          </div>
        </div>
        <Link href="/" className="navlink hide-sm" style={{ padding: "6px 10px", fontSize: 13 }}><ExternalLink size={15} />{t(locale, "nav_portal")}</Link>
        <div className="row" style={{ gap: 8 }}>
          <LangToggle locale={locale} dark />
          <form action="/api/act" method="post">
            <input type="hidden" name="intent" value="agent_logout" />
            <button className="btn btn-sm" style={{ background: "#272d57", border: "1px solid #3a4175" }} aria-label={t(locale, "sign_out")}>
              <LogOut size={14} /><span className="hide-sm">{t(locale, "sign_out")}</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
