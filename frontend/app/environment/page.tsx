import { fetchEnvironment, fetchWorkspaces, fetchSyncStatus } from "@/lib/api";
import AutoRefresh from "@/app/AutoRefresh";
import RefreshIndicator from "@/app/RefreshIndicator";
import EnvironmentCharts from "./EnvironmentCharts";

export default async function EnvironmentPage() {
  const [env, workspaces, syncStatus] = await Promise.all([
    fetchEnvironment(),
    fetchWorkspaces(),
    fetchSyncStatus(),
  ]);

  const workspaceMap = Object.fromEntries(
    workspaces.map((w: { id: string; name: string }) => [w.id, w.name])
  );

  return (
    <div>
      <AutoRefresh />
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Environment
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Overview of your Power BI environment
          </p>
        </div>
        <RefreshIndicator lastSyncedAt={syncStatus.last_synced_at} />
      </div>

      <EnvironmentCharts env={env} workspaceMap={workspaceMap} />
    </div>
  );
}
