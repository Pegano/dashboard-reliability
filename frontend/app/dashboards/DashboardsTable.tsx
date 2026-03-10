"use client";

import Link from "next/link";
import { useState } from "react";
import { Report, Incident, HealthStatus } from "@/lib/types";
import StatusDot from "@/components/StatusDot";

interface Row {
  report: Report;
  status: HealthStatus;
  activeIncidents: number;
  datasetName: string;
  workspaceName: string;
}

interface Props {
  rows: Row[];
  counts: Record<HealthStatus, number>;
  workspaceMap: Record<string, string>;
}

const statusLabel: Record<HealthStatus, string> = {
  green: "Healthy",
  yellow: "Degraded",
  red: "Critical",
};

type SortKey = "status" | "name" | "model" | "workspace" | "incidents";
type SortDir = "asc" | "desc";
const statusOrder: Record<HealthStatus, number> = { red: 0, yellow: 1, green: 2 };

function sortRows(rows: Row[], key: SortKey, dir: SortDir): Row[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "status") cmp = statusOrder[a.status] - statusOrder[b.status];
    else if (key === "name") cmp = a.report.name.localeCompare(b.report.name);
    else if (key === "model") cmp = a.datasetName.localeCompare(b.datasetName);
    else if (key === "workspace") cmp = a.workspaceName.localeCompare(b.workspaceName);
    else if (key === "incidents") cmp = a.activeIncidents - b.activeIncidents;
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function DashboardsTable({ rows, counts, workspaceMap }: Props) {
  const [filter, setFilter] = useState<HealthStatus | null>(null);
  const [workspaceFilter, setWorkspaceFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const workspaceIds = Array.from(new Set(rows.map((r) => r.report.workspace_id)));
  const showWorkspaceFilter = workspaceIds.length >= 2;

  const filtered = rows.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (workspaceFilter && r.report.workspace_id !== workspaceFilter) return false;
    return true;
  });

  const visible = sortRows(filtered, sortKey, sortDir);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ opacity: 0.25 }}> ↕</span>;
    return <span> {sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <>
      {showWorkspaceFilter && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setWorkspaceFilter(null)}
            className="text-xs px-3 py-1.5 rounded border transition-colors"
            style={{
              background: workspaceFilter === null ? "var(--surface)" : "transparent",
              borderColor: workspaceFilter === null ? "var(--teal)" : "var(--border)",
              color: workspaceFilter === null ? "var(--teal)" : "var(--text-muted)",
            }}
          >
            All workspaces
          </button>
          {workspaceIds.map((wsId) => (
            <button
              key={wsId}
              onClick={() => setWorkspaceFilter((f) => (f === wsId ? null : wsId))}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{
                background: workspaceFilter === wsId ? "var(--surface)" : "transparent",
                borderColor: workspaceFilter === wsId ? "var(--teal)" : "var(--border)",
                color: workspaceFilter === wsId ? "var(--teal)" : "var(--text-muted)",
              }}
            >
              {workspaceMap[wsId] ?? wsId}
            </button>
          ))}
        </div>
      )}

      {/* Status tiles — identical to ModelsTable */}
      <div className="flex gap-4 mb-8">
        {(["green", "yellow", "red"] as HealthStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter((f) => (f === status ? null : status))}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors"
            style={{
              background: filter === status ? "var(--surface-hover, var(--surface))" : "var(--surface)",
              borderColor: filter === status
                ? status === "red" ? "rgba(242,73,92,0.6)" : status === "yellow" ? "rgba(250,222,42,0.6)" : "rgba(115,191,105,0.6)"
                : "var(--border)",
              cursor: "pointer",
            }}
          >
            <StatusDot status={status} />
            <span className="text-2xl font-semibold">{counts[status]}</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {statusLabel[status]}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              {([
                { key: "status", label: "Status" },
                { key: "name", label: "Dashboard" },
                { key: "model", label: "Model" },
                ...(showWorkspaceFilter ? [{ key: "workspace", label: "Workspace" }] : []),
                { key: "incidents", label: "Issues" },
              ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                <th
                  key={key}
                  className="px-4 py-3 font-medium cursor-pointer select-none"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => handleSort(key)}
                >
                  {label}<SortIndicator col={key} />
                </th>
              ))}
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.report.id}
                className="border-b transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <td className="px-4 py-4">
                  <StatusDot status={r.status} showLabel size="sm" />
                </td>
                <td className="px-4 py-4 font-medium" style={{ color: "var(--text)" }}>
                  {r.report.name}
                </td>
                <td className="px-4 py-4 text-sm">
                  <Link
                    href={`/pipelines/${r.report.dataset_id}`}
                    className="hover:underline"
                    style={{ color: "var(--teal)" }}
                  >
                    {r.datasetName}
                  </Link>
                </td>
                {showWorkspaceFilter && (
                  <td className="px-4 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                    {r.workspaceName}
                  </td>
                )}
                <td className="px-4 py-4">
                  {r.activeIncidents > 0 ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(242,73,92,0.15)", color: "var(--red)" }}>
                      {r.activeIncidents} active
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {r.report.web_url ? (
                    <a
                      href={r.report.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:opacity-70"
                      style={{ color: "var(--teal)" }}
                    >
                      Open ↗
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  No dashboards found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
