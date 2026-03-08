import { HealthStatus } from "@/lib/types";

const colors: Record<HealthStatus, string> = {
  green: "var(--green)",
  yellow: "var(--yellow)",
  red: "var(--red)",
};

const labels: Record<HealthStatus, string> = {
  green: "Healthy",
  yellow: "Degraded",
  red: "Critical",
};

interface Props {
  status: HealthStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function StatusDot({ status, showLabel = false, size = "md" }: Props) {
  const px = size === "sm" ? "8px" : "10px";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="rounded-full inline-block flex-shrink-0"
        style={{
          width: px,
          height: px,
          background: colors[status],
          boxShadow: `0 0 6px ${colors[status]}88`,
        }}
      />
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: colors[status] }}>
          {labels[status]}
        </span>
      )}
    </span>
  );
}
