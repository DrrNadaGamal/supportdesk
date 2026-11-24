import { Star } from "lucide-react";
import { t, type Locale, type Key } from "@/lib/i18n";
import { slaOf } from "@/lib/sla";
import { fmtDuration } from "@/lib/format";

export function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return <span className={`badge b-${status}`}><span className="dot" />{t(locale, `s_${status}` as Key)}</span>;
}
export function PriorityBadge({ priority, locale }: { priority: string; locale: Locale }) {
  return <span className={`badge b-${priority}`}>{t(locale, `p_${priority}` as Key)}</span>;
}

type SlaTicket = Parameters<typeof slaOf>[0];
export function SlaPill({ ticket, locale }: { ticket: SlaTicket; locale: Locale }) {
  const s = slaOf(ticket);
  if (s.state === "paused") return <span className="badge sla-met">{t(locale, "sla_paused")}</span>;
  if (s.state === "met") return <span className="badge sla-met">{t(locale, "sla_met")}</span>;
  if (s.state === "breached" && s.remaining === null) return <span className="badge sla-breached">{t(locale, "sla_breached")}</span>;
  const rem = s.remaining ?? 0;
  const text = rem < 0 ? `${t(locale, "overdue_by")} ${fmtDuration(rem, locale)}` : `${fmtDuration(rem, locale)}`;
  return (
    <span className={`badge sla-${s.state}`} title={s.label === "first_response" ? t(locale, "sla_first") : t(locale, "sla_resolution")}>
      {s.label === "first_response" ? "1st · " : "↻ "}{text}
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} fill={i <= value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}
