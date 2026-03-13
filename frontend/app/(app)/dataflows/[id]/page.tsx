import { cookies } from "next/headers";
import { fetchDataflows, fetchDataflowRuns, fetchWorkspaces, fetchDataflowSchema } from "@/lib/api";
import { Dataflow, DataflowRun, Workspace } from "@/lib/types";
import { notFound } from "next/navigation";
import StatusDot from "@/components/StatusDot";
import DataflowDetail from "./DataflowDetail";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function DataflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = (await cookies()).get("session")?.value;
  const { id } = await params;

  const [dataflows, runs, workspaces, schemaData] = await Promise.all([
    fetchDataflows(undefined, session),
    fetchDataflowRuns(id, session),
    fetchWorkspaces(session),
    fetchDataflowSchema(id, session),
  ]);

  const dataflow: Dataflow | undefined = dataflows.find((df: Dataflow) => df.id === id);
  if (!dataflow) notFound();

  const workspaceMap = Object.fromEntries(workspaces.map((w: Workspace) => [w.id, w.name]));
  const workspaceName = workspaceMap[dataflow.workspace_id] ?? dataflow.workspace_id;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusDot status={dataflow.health} showLabel />
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            {dataflow.name}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <span style={{ color: "var(--text)" }}>{workspaceName}</span>
          {" "}&middot; Last refresh: {formatDate(dataflow.last_refresh_at)}
          {dataflow.description && <> &middot; {dataflow.description}</>}
        </p>
      </div>

      <DataflowDetail runs={runs} entitySchema={schemaData.entities ?? []} />
    </div>
  );
}
