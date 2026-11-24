"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, BookOpen, MessageSquareText, Users, Settings } from "lucide-react";

const icons: Record<string, React.ReactNode> = {
  dash: <LayoutDashboard size={17} />,
  inbox: <Inbox size={17} />,
  kb: <BookOpen size={17} />,
  canned: <MessageSquareText size={17} />,
  team: <Users size={17} />,
  settings: <Settings size={17} />,
};

export default function NavLinks({ items }: { items: Array<{ href: string; label: string; icon: string }> }) {
  const path = usePathname();
  return (
    <nav className="sidenav">
      {items.map((i) => {
        const active = i.href === "/app" ? path === "/app" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={`navlink ${active ? "active" : ""}`}>
            {icons[i.icon]}
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
