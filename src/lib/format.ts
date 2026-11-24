import type { Locale } from "./i18n";

const tag = (l: Locale) => (l === "ar" ? "ar-EG" : "en-US");

export function fmtDate(d: Date, l: Locale) {
  return new Intl.DateTimeFormat(tag(l), { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" }).format(d);
}
export function fmtDateTime(d: Date, l: Locale) {
  return new Intl.DateTimeFormat(tag(l), {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Cairo",
  }).format(d);
}
export function fmtNum(n: number, l: Locale, digits = 0) {
  return new Intl.NumberFormat(tag(l), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}
export function fmtDuration(ms: number, l: Locale) {
  const abs = Math.abs(ms);
  const m = Math.round(abs / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const n = (x: number) => fmtNum(x, l);
  if (l === "ar") {
    if (d >= 1) return `${n(d)} ي ${n(h % 24)} س`;
    if (h >= 1) return `${n(h)} س ${n(m % 60)} د`;
    return `${n(m)} د`;
  }
  if (d >= 1) return `${n(d)}d ${n(h % 24)}h`;
  if (h >= 1) return `${n(h)}h ${n(m % 60)}m`;
  return `${n(m)}m`;
}
export function ago(d: Date, l: Locale) {
  const s = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(tag(l), { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.max(1, Math.round(s / 60)), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}
export function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
