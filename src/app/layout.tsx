import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/lib/locale-server";

export const metadata: Metadata = {
  title: "SupportDesk - Helpdesk and customer support demo",
  description:
    "Bilingual (English and Arabic RTL) helpdesk: ticket inbox with SLA timers, knowledge base, canned replies and customer portal. Demo build with seeded data.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>{children}</body>
    </html>
  );
}
