import Link from "next/link";
import { fetchIncidents, fetchDatasets } from "@/lib/api";
import { Incident, Dataset } from "@/lib/types";
import SeverityBadge from "@/components/SeverityBadge";

const incidentTypeLabel: Record<string, string> = {
  refresh_failed: "Refresh mislukt",
  refresh_delayed: "Refresh vertraagd",
  schema_change: "Schema wijziging",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function IncidentsPage() {
  const [incidents, datasets] = await Promise.all([
    fetchIncidents(),
    fetchDatasets(),
  ]);

  const datasetMap = Object.fromEntries(datasets.map((d: Dataset) => [d.id, d.name]));
  const active = incidents.filter((i: Incident) => i.status === "active");
  const resolved = incidents.filter((i: Incident) => i.status === "resolved");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>Incidents</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {active.length} actief &middot; {resolved.length} opgelost
        </p>
      </div>

      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Actief
          </h2>
          <IncidentTable incidents={active} datasetMap={datasetMap} formatDate={formatDate} />
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Opgelost
          </h2>
          <IncidentTable incidents={resolved} datasetMap={datasetMap} formatDate={formatDate} />
        </div>
      )}

      {incidents.length === 0 && (
        <div
          className="rounded-lg border px-6 py-12 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Geen incidents gevonden.</p>
        </div>
      )}
    </div>
  );
}

function IncidentTable({
  incidents, datasetMap, formatDate,
}: {
  incidents: Incident[];
  datasetMap: Record<string, string>;
  formatDate: (d: string | null) => string;
}) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Severity</th>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Type</th>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Pipeline</th>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Gedetecteerd</th>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Root cause</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              className="border-b hover:opacity-80 transition-opacity"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <td className="px-4 py-4">
                <SeverityBadge severity={incident.severity} />
              </td>
              <td className="px-4 py-4" style={{ color: "var(--text)" }}>
                {incidentTypeLabel[incident.type] ?? incident.type}
              </td>
              <td className="px-4 py-4">
                <Link
                  href={`/pipelines/${incident.dataset_id}`}
                  className="hover:underline"
                  style={{ color: "var(--teal)" }}
                >
                  {datasetMap[incident.dataset_id] ?? incident.dataset_id}
                </Link>
              </td>
              <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
                {formatDate(incident.detected_at)}
              </td>
              <td className="px-4 py-4 max-w-xs truncate" style={{ color: "var(--text-muted)" }}>
                {incident.root_cause_hint ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
