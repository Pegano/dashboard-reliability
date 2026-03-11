import { fetchIncidents, fetchDatasets, fetchWorkspaces, fetchSyncStatus } from "@/lib/api";
import { Incident } from "@/lib/types";
import IssuesTable from "./IssuesTable";
import AutoRefresh from "../AutoRefresh";
import RefreshIndicator from "../RefreshIndicator";

export default async function IncidentsPage() {
  const [incidents, datasets, workspaces, syncStatus] = await Promise.all([
    fetchIncidents(),
    fetchDatasets(),
    fetchWorkspaces(),
    fetchSyncStatus(),
  ]);

  const active = incidents.filter((i: Incident) => i.status === "active").length;
  const resolved = incidents.filter((i: Incident) => i.status === "resolved").length;

  return (
    <div>
      <AutoRefresh />
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>Issues</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {active} active &middot; {resolved} resolved
          </p>
        </div>
        <RefreshIndicator lastSyncedAt={syncStatus.last_synced_at} />
      </div>

      <IssuesTable incidents={incidents} datasets={datasets} workspaces={workspaces} />
    </div>
  );
}
