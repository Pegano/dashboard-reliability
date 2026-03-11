import { cookies } from "next/headers";
import { fetchDatasets, fetchDatasetHealth, fetchIncidents, fetchReports, fetchRuns, fetchWorkspaces } from "@/lib/api";
import { Dataset, DatasetHealth, Incident, Report, RefreshRun, HealthStatus, Workspace } from "@/lib/types";
import StatusDot from "@/components/StatusDot";
import { notFound } from "next/navigation";
import PipelineTabs from "./PipelineTabs";

function deriveStatus(incidents: Incident[]): HealthStatus {
  const active = incidents.filter((i) => i.status === "active");
  if (active.some((i) => i.severity === "critical")) return "red";
  if (active.some((i) => i.severity === "warning")) return "yellow";
  return "green";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function PipelineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; incident?: string }>;
}) {
  const session = (await cookies()).get("session")?.value;
  const { id } = await params;
  const { tab, incident: focusIncidentId } = await searchParams;

  const [datasets, allIncidents, reports, runs, workspaces, health] = await Promise.all([
    fetchDatasets(undefined, session),
    fetchIncidents(undefined, session),
    fetchReports(id, session),
    fetchRuns(id, session),
    fetchWorkspaces(session),
    fetchDatasetHealth(id, session),
  ]);

  const dataset: Dataset | undefined = datasets.find((d: Dataset) => d.id === id);
  if (!dataset) notFound();

  const workspaceMap = Object.fromEntries(workspaces.map((w: Workspace) => [w.id, w.name]));
  const workspaceName = workspaceMap[dataset.workspace_id] ?? dataset.workspace_id;

  const incidents: Incident[] = allIncidents.filter((i: Incident) => i.dataset_id === id);
  const activeIncidents = incidents.filter((i) => i.status === "active");
  const status = deriveStatus(incidents);

  const defaultTab = tab === "Runs" ? "Runs" : tab === "fix" ? "Fix" : tab === "issues" || activeIncidents.length > 0 ? "Issues" : "Runs";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusDot status={status} showLabel />
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            {dataset.name}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <span style={{ color: "var(--text)" }}>{workspaceName}</span>
          {" "}&middot; Last sync: {formatDate(dataset.synced_at)} &middot; Refresh: {dataset.refresh_status}
          {reports.length > 0 && (
            <> &middot; {reports.length} report{reports.length !== 1 ? "s" : ""}</>
          )}
        </p>
      </div>

      {/* Tabs */}
      <PipelineTabs
        dataset={dataset}
        health={health as DatasetHealth}
        activeIncidents={activeIncidents}
        allIncidents={incidents}
        reports={reports}
        runs={runs}
        defaultTab={defaultTab as "Runs" | "Issues" | "Fix"}
        focusIncidentId={focusIncidentId}
      />
    </div>
  );
}
