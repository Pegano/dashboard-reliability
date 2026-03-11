import { cookies } from "next/headers";
import { fetchRuns, fetchSyncStatus, fetchIncidents } from "@/lib/api";
import RunsTable from "./RunsTable";
import AutoRefresh from "../AutoRefresh";
import RefreshIndicator from "../RefreshIndicator";
import { Incident } from "@/lib/types";

export default async function RunsPage() {
  const session = (await cookies()).get("session")?.value;
  const [runs, syncStatus, incidents] = await Promise.all([
    fetchRuns(undefined, session),
    fetchSyncStatus(session),
    fetchIncidents(undefined, session),
  ]);

  const failed = runs.filter((r: { status: string }) => r.status === "failed").length;
  const completed = runs.filter((r: { status: string }) => r.status === "completed").length;

  return (
    <div>
      <AutoRefresh />
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>Runs</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {completed} completed &middot; {failed} failed
          </p>
        </div>
        <RefreshIndicator lastSyncedAt={syncStatus.last_synced_at} />
      </div>

      <RunsTable runs={runs} activeIncidents={incidents.filter((i: Incident) => i.status === "active")} />
    </div>
  );
}
