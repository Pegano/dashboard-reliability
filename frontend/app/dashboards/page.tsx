import { fetchReports, fetchDatasets, fetchIncidents, fetchWorkspaces, fetchSyncStatus } from "@/lib/api";
import { Report, Dataset, Incident, HealthStatus, Workspace } from "@/lib/types";
import DashboardsTable from "./DashboardsTable";
import AutoRefresh from "../AutoRefresh";
import RefreshIndicator from "../RefreshIndicator";

function deriveStatus(datasetId: string, incidents: Incident[]): HealthStatus {
  const active = incidents.filter((i) => i.dataset_id === datasetId && i.status === "active");
  if (active.some((i) => i.severity === "critical")) return "red";
  if (active.some((i) => i.severity === "warning")) return "yellow";
  return "green";
}

export default async function DashboardsPage() {
  const [reports, datasets, incidents, workspaces, syncStatus] = await Promise.all([
    fetchReports(),
    fetchDatasets(),
    fetchIncidents(),
    fetchWorkspaces(),
    fetchSyncStatus(),
  ]);

  const datasetMap = Object.fromEntries(datasets.map((d: Dataset) => [d.id, d]));
  const workspaceMap = Object.fromEntries(workspaces.map((w: Workspace) => [w.id, w.name]));

  const counts: Record<HealthStatus, number> = { green: 0, yellow: 0, red: 0 };

  const rows = reports.map((report: Report) => {
    const status = deriveStatus(report.dataset_id, incidents);
    counts[status]++;
    const activeIncidents = incidents.filter(
      (i: Incident) => i.dataset_id === report.dataset_id && i.status === "active"
    ).length;
    return {
      report,
      status,
      activeIncidents,
      datasetName: datasetMap[report.dataset_id]?.name ?? "—",
      workspaceName: workspaceMap[report.workspace_id] ?? "—",
    };
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <AutoRefresh />
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Dashboards
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Health overview of all reports
          </p>
        </div>
        <RefreshIndicator lastSyncedAt={syncStatus.last_synced_at} />
      </div>

      <DashboardsTable rows={rows} counts={counts} workspaceMap={workspaceMap} />
    </div>
  );
}
