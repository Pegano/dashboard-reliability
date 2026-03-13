import { cookies } from "next/headers";
import { fetchDataflows, fetchWorkspaces, fetchSyncStatus } from "@/lib/api";
import { Dataflow, Workspace } from "@/lib/types";
import Link from "next/link";
import StatusDot from "@/components/StatusDot";
import AutoRefresh from "../AutoRefresh";
import RefreshIndicator from "../RefreshIndicator";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function DataflowsPage() {
  const session = (await cookies()).get("session")?.value;
  const [dataflows, workspaces, syncStatus] = await Promise.all([
    fetchDataflows(undefined, session),
    fetchWorkspaces(session),
    fetchSyncStatus(session),
  ]);

  const workspaceMap = Object.fromEntries(workspaces.map((w: Workspace) => [w.id, w.name]));

  const counts = { green: 0, yellow: 0, red: 0 } as Record<string, number>;
  for (const df of dataflows) counts[df.health]++;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <AutoRefresh />
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Dataflows
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Power BI service dataflows — transformation layer between datasource and dataset
          </p>
        </div>
        <RefreshIndicator lastSyncedAt={syncStatus.last_synced_at} />
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 mb-6">
        {[
          { label: "Healthy", color: "var(--green)", count: counts.green },
          { label: "Warning", color: "var(--yellow)", count: counts.yellow },
          { label: "Critical", color: "var(--red)", count: counts.red },
        ].map(({ label, color, count }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>{count}</span>
          </div>
        ))}
      </div>

      {dataflows.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No dataflows found. Dataflows are synced automatically — if you have dataflows in your Power BI workspaces they will appear here after the next sync.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Status", "Name", "Workspace", "Last refresh", "Issues"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataflows.map((df: Dataflow) => (
                <tr
                  key={df.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                  className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <StatusDot status={df.health} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dataflows/${df.id}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--text)" }}
                    >
                      {df.name}
                    </Link>
                    {df.description && (
                      <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: "var(--text-muted)" }}>
                        {df.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {workspaceMap[df.workspace_id] ?? df.workspace_id}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {formatDate(df.last_refresh_at)}
                  </td>
                  <td className="px-4 py-3">
                    {df.active_incidents > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: df.health === "red" ? "rgba(255,80,80,0.1)" : "rgba(255,180,0,0.1)",
                          color: df.health === "red" ? "var(--red)" : "var(--yellow)",
                        }}
                      >
                        {df.active_incidents} issue{df.active_incidents !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
