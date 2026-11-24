import { t, type Locale } from "@/lib/i18n";

export default function LangToggle({ locale, dark = false }: { locale: Locale; dark?: boolean }) {
  return (
    <form action="/api/act" method="post">
      <input type="hidden" name="intent" value="locale" />
      <input type="hidden" name="locale" value={locale === "ar" ? "en" : "ar"} />
      <button
        type="submit"
        className="btn btn-sm"
        style={{ background: dark ? "#272d57" : "#fff", color: dark ? "#fff" : "var(--text)", border: dark ? "1px solid #3a4175" : "1px solid var(--border)" }}
        aria-label="Switch language"
      >
        {t(locale, "lang_switch")}
      </button>
    </form>
  );
}
