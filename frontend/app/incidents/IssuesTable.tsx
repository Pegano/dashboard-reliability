"use client";

import Link from "next/link";
import { useState } from "react";
import { Incident, Dataset, Workspace } from "@/lib/types";
import SeverityBadge from "@/components/SeverityBadge";

const incidentTypeLabel: Record<string, string> = {
  refresh_failed: "Refresh failed",
  refresh_delayed: "Refresh delayed",
  schema_change: "Schema change",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1 };

type SortKey = "severity" | "type" | "model" | "workspace" | "detected" | "resolved" | "root_cause" | "impact";
type SortDir = "asc" | "desc";

interface Row {
  incident: Incident;
  datasetName: string;
  workspaceName: string;
}

function sortRows(rows: Row[], key: SortKey, dir: SortDir): Row[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "severity") {
      cmp = (SEVERITY_ORDER[a.incident.severity] ?? 9) - (SEVERITY_ORDER[b.incident.severity] ?? 9);
    } else if (key === "type") {
      cmp = (incidentTypeLabel[a.incident.type] ?? a.incident.type).localeCompare(incidentTypeLabel[b.incident.type] ?? b.incident.type);
    } else if (key === "model") {
      cmp = a.datasetName.localeCompare(b.datasetName);
    } else if (key === "workspace") {
      cmp = a.workspaceName.localeCompare(b.workspaceName);
    } else if (key === "detected") {
      cmp = (a.incident.detected_at ?? "").localeCompare(b.incident.detected_at ?? "");
    } else if (key === "resolved") {
      cmp = (a.incident.resolved_at ?? "").localeCompare(b.incident.resolved_at ?? "");
    } else if (key === "root_cause") {
      cmp = (a.incident.root_cause_hint ?? "").localeCompare(b.incident.root_cause_hint ?? "");
    } else if (key === "impact") {
      cmp = (a.incident.affected_reports ?? 0) - (b.incident.affected_reports ?? 0);
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function IssuesTable({
  incidents,
  datasets,
  workspaces,
}: {
  incidents: Incident[];
  datasets: Dataset[];
  workspaces: Workspace[];
}) {
  const datasetMap = Object.fromEntries(datasets.map((d) => [d.id, d]));
  const workspaceMap = Object.fromEntries(workspaces.map((w) => [w.id, w.name]));

  const [sortKey, setSortKey] = useState<SortKey>("detected");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeOpen, setActiveOpen] = useState(true);
  const [resolvedOpen, setResolvedOpen] = useState(true);

  const toRow = (i: Incident): Row => {
    const ds = datasetMap[i.dataset_id];
    return {
      incident: i,
      datasetName: ds?.name ?? i.dataset_id,
      workspaceName: ds ? (workspaceMap[ds.workspace_id] ?? "—") : "—",
    };
  };

  const activeRows = sortRows(incidents.filter((i) => i.status === "active").map(toRow), sortKey, sortDir);
  const resolvedRows = sortRows(incidents.filter((i) => i.status === "resolved").map(toRow), sortKey, sortDir);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "detected" || key === "resolved" ? "desc" : "asc");
    }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ opacity: 0.25 }}> ↕</span>;
    return <span> {sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const thStyle = { color: "var(--text-muted)" };
  const thClass = "px-4 py-3 font-medium text-left cursor-pointer select-none";

  const columns: { key: SortKey; label: string }[] = [
    { key: "severity", label: "Severity" },
    { key: "type", label: "Type" },
    { key: "model", label: "Model" },
    { key: "workspace", label: "Workspace" },
    { key: "detected", label: "Detected" },
    { key: "resolved", label: "Resolved" },
    { key: "root_cause", label: "Root cause" },
    { key: "impact", label: "Impact" },
  ];

  function TableBody({ rows }: { rows: Row[] }) {
    return (
      <>
        {rows.map(({ incident, datasetName, workspaceName }) => (
          <tr
            key={incident.id}
            className="border-b hover:opacity-80 transition-opacity"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <td className="px-4 py-4"><SeverityBadge severity={incident.severity} /></td>
            <td className="px-4 py-4" style={{ color: "var(--text)" }}>
              {incidentTypeLabel[incident.type] ?? incident.type}
            </td>
            <td className="px-4 py-4">
              <Link
                href={`/pipelines/${incident.dataset_id}?tab=issues`}
                className="hover:underline"
                style={{ color: "var(--teal)" }}
              >
                {datasetName}
              </Link>
            </td>
            <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>{workspaceName}</td>
            <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>{formatDate(incident.detected_at)}</td>
            <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>{formatDate(incident.resolved_at)}</td>
            <td className="px-4 py-4 max-w-xs truncate" style={{ color: "var(--text-muted)" }}>
              {incident.root_cause_hint ?? "—"}
            </td>
            <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
              {(incident.affected_reports ?? 0) > 0 ? `${incident.affected_reports} report${incident.affected_reports === 1 ? "" : "s"}` : "—"}
            </td>
          </tr>
        ))}
      </>
    );
  }

  if (incidents.length === 0) {
    return (
      <div
        className="rounded-lg border px-6 py-12 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No issues found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {columns.map(({ key, label }) => (
              <th key={key} className={thClass} style={thStyle} onClick={() => handleSort(key)}>
                {label}<SortIndicator col={key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeRows.length > 0 && (
            <>
              <tr
                className="cursor-pointer select-none"
                style={{ background: "var(--surface)" }}
                onClick={() => setActiveOpen((v) => !v)}
              >
                <td colSpan={8} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {activeOpen ? "▾" : "▸"} Active ({activeRows.length})
                </td>
              </tr>
              {activeOpen && <TableBody rows={activeRows} />}
            </>
          )}

          {resolvedRows.length > 0 && (
            <>
              <tr
                className="cursor-pointer select-none"
                style={{ background: "var(--surface)" }}
                onClick={() => setResolvedOpen((v) => !v)}
              >
                <td colSpan={8} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {resolvedOpen ? "▾" : "▸"} Resolved ({resolvedRows.length})
                </td>
              </tr>
              {resolvedOpen && <TableBody rows={resolvedRows} />}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
