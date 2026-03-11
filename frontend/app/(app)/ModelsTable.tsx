"use client";

import Link from "next/link";
import { useState } from "react";
import { Dataset, Incident, HealthStatus, Workspace } from "@/lib/types";
import StatusDot from "@/components/StatusDot";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Row = Dataset & { status: HealthStatus; activeIncidents: number };
type SortKey = "status" | "name" | "workspace" | "last_refresh" | "incidents";
type SortDir = "asc" | "desc";

const statusOrder: Record<HealthStatus, number> = { red: 0, yellow: 1, green: 2 };

function sortRows(rows: Row[], key: SortKey, dir: SortDir, workspaceMap: Record<string, string>): Row[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "status") cmp = statusOrder[a.status] - statusOrder[b.status];
    else if (key === "name") cmp = a.name.localeCompare(b.name);
    else if (key === "workspace") cmp = (workspaceMap[a.workspace_id] ?? "").localeCompare(workspaceMap[b.workspace_id] ?? "");
    else if (key === "last_refresh") cmp = (a.last_refresh_at ?? "").localeCompare(b.last_refresh_at ?? "");
    else if (key === "incidents") cmp = a.activeIncidents - b.activeIncidents;
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function ModelsTable({
  rows,
  counts,
  workspaceMap,
}: {
  rows: Row[];
  counts: Record<HealthStatus, number>;
  workspaceMap: Record<string, string>;
}) {
  const [filter, setFilter] = useState<HealthStatus | null>(null);
  const [workspaceFilter, setWorkspaceFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Derive unique workspaces from rows
  const workspaceIds = Array.from(new Set(rows.map((r) => r.workspace_id)));
  const showWorkspaceFilter = workspaceIds.length >= 2;

  const filtered = rows.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (workspaceFilter && r.workspace_id !== workspaceFilter) return false;
    return true;
  });

  const visible = sortRows(filtered, sortKey, sortDir, workspaceMap);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ opacity: 0.25 }}> ↕</span>;
    return <span> {sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function toggleFilter(status: HealthStatus) {
    setFilter((f) => (f === status ? null : status));
  }

  const statusLabel: Record<HealthStatus, string> = {
    green: "Healthy",
    yellow: "Degraded",
    red: "Critical",
  };

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
      <div className="flex gap-4 mb-8">
        {(["green", "yellow", "red"] as HealthStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => toggleFilter(status)}
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
                { key: "name", label: "Model" },
                { key: "workspace", label: "Workspace" },
                { key: "last_refresh", label: "Last refresh" },
                { key: "incidents", label: "Incidents" },
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
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className="border-b transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <td className="px-4 py-4">
                  <StatusDot status={row.status} showLabel size="sm" />
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/pipelines/${row.id}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--teal)" }}
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                  {workspaceMap[row.workspace_id] ?? "—"}
                </td>
                <td className="px-4 py-4" style={{ color: "var(--text-muted)" }} suppressHydrationWarning>
                  {timeAgo(row.last_refresh_at)}
                </td>
                <td className="px-4 py-4">
                  {row.activeIncidents > 0 ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(242,73,92,0.15)", color: "var(--red)" }}>
                      {row.activeIncidents} active
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  No models found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
