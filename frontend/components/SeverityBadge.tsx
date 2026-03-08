import { IncidentSeverity } from "@/lib/types";

const styles: Record<IncidentSeverity, { bg: string; color: string; label: string }> = {
  critical: { bg: "rgba(242,73,92,0.15)", color: "var(--red)", label: "Critical" },
  warning:  { bg: "rgba(250,222,42,0.12)", color: "var(--yellow)", label: "Warning" },
};

export default function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const s = styles[severity];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
