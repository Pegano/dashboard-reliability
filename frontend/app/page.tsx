import Link from "next/link";
import { fetchDatasets, fetchIncidents } from "@/lib/api";
import { Dataset, Incident, HealthStatus } from "@/lib/types";
import StatusDot from "@/components/StatusDot";

function deriveStatus(dataset: Dataset, incidents: Incident[]): HealthStatus {
  const active = incidents.filter(
    (i) => i.dataset_id === dataset.id && i.status === "active"
  );
  if (active.some((i) => i.severity === "critical")) return "red";
  if (active.some((i) => i.severity === "warning")) return "yellow";
  return "green";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function PipelinesPage() {
  const [datasets, incidents] = await Promise.all([
    fetchDatasets(),
    fetchIncidents(),
  ]);

  const counts = { green: 0, yellow: 0, red: 0 };

  const rows = datasets.map((ds: Dataset) => {
    const status = deriveStatus(ds, incidents);
    counts[status]++;
    const activeIncidents = incidents.filter(
      (i: Incident) => i.dataset_id === ds.id && i.status === "active"
    ).length;
    return { ...ds, status, activeIncidents };
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
          Pipelines
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Health overzicht van alle datasets en refresh pipelines
        </p>
      </div>

      <div className="flex gap-4 mb-8">
        {(["green", "yellow", "red"] as HealthStatus[]).map((status) => (
          <div
            key={status}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <StatusDot status={status} />
            <span className="text-2xl font-semibold">{counts[status]}</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {status === "green" ? "Healthy" : status === "yellow" ? "Degraded" : "Critical"}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Pipeline</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Laatste refresh</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Incidents</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: Dataset & { status: HealthStatus; activeIncidents: number }) => (
              <tr
                key={row.id}
                className="border-b transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <td className="px-4 py-4">
                  <StatusDot status={row.status} showLabel size="sm" />
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/pipelines/${row.id}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--teal)" }}
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
                  {timeAgo(row.last_refresh_at)}
                </td>
                <td className="px-4 py-4">
                  {row.activeIncidents > 0 ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(242,73,92,0.15)", color: "var(--red)" }}>
                      {row.activeIncidents} active
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  Geen pipelines gevonden. Controleer of de scheduler draait.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
