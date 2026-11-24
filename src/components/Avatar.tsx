import { initials } from "@/lib/format";

export default function Avatar({ name, color = "#6366f1", size = "md" }: { name: string; color?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`avatar ${size === "lg" ? "avatar-lg" : size === "sm" ? "avatar-sm" : ""}`} style={{ background: color }} title={name}>
      {initials(name)}
    </span>
  );
}
