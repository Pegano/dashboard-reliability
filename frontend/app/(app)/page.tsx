import { cookies } from "next/headers";
import { fetchDatasets, fetchIncidents, fetchWorkspaces, fetchSyncStatus } from "@/lib/api";
import { Dataset, Incident, HealthStatus, Workspace } from "@/lib/types";
import ModelsTable from "./ModelsTable";
import AutoRefresh from "./AutoRefresh";
import RefreshIndicator from "./RefreshIndicator";

function deriveStatus(dataset: Dataset, incidents: Incident[]): HealthStatus {
  const active = incidents.filter(
    (i) => i.dataset_id === dataset.id && i.status === "active"
  );
  if (active.some((i) => i.severity === "critical")) return "red";
  if (active.some((i) => i.severity === "warning")) return "yellow";
  return "green";
}

export default async function PipelinesPage() {
  const session = (await cookies()).get("session")?.value;
  const [datasets, incidents, workspaces, syncStatus] = await Promise.all([
    fetchDatasets(undefined, session),
    fetchIncidents(undefined, session),
    fetchWorkspaces(session),
    fetchSyncStatus(session),
  ]);

  const workspaceMap = Object.fromEntries(workspaces.map((w: Workspace) => [w.id, w.name]));
  const counts: Record<HealthStatus, number> = { green: 0, yellow: 0, red: 0 };

  const rows = datasets.map((ds: Dataset) => {
    const status = deriveStatus(ds, incidents);
    counts[status]++;
    const activeIncidents = incidents.filter(
      (i: Incident) => i.dataset_id === ds.id && i.status === "active"
    ).length;
    return { ...ds, status, activeIncidents };
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <AutoRefresh />
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Models
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Health overview of all semantic models
          </p>
        </div>
        <RefreshIndicator lastSyncedAt={syncStatus.last_synced_at} />
      </div>

      <ModelsTable rows={rows} counts={counts} workspaceMap={workspaceMap} />
    </div>
  );
}
