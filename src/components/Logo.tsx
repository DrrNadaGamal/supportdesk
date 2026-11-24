import { LifeBuoy } from "lucide-react";

export default function Logo({ name, dark = false }: { name: string; dark?: boolean }) {
  return (
    <span className="row" style={{ gap: 10, fontWeight: 800, fontSize: 18, color: dark ? "#fff" : "var(--text)" }}>
      <span className="logo-mark"><LifeBuoy size={18} /></span>
      {name}
    </span>
  );
}
