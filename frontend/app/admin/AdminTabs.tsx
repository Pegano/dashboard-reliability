"use client";

import { useState } from "react";
import AdminTable from "./AdminTable";
import MetricsList from "./MetricsList";
import IncidentDictionary from "./IncidentDictionary";

interface ModelRefresh {
  dataset_id: string;
  name: string;
  workspace: string;
  last_refresh_at: string | null;
  status: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ModelRefreshesTab({ modelRefreshes }: { modelRefreshes: ModelRefresh[] }) {
  const sorted = [...modelRefreshes].sort((a, b) => {
    if (!a.last_refresh_at) return 1;
    if (!b.last_refresh_at) return -1;
    return new Date(b.last_refresh_at).getTime() - new Date(a.last_refresh_at).getTime();
  });

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Model</th>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Workspace</th>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Last refresh</th>
            <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.dataset_id} className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              <td className="px-4 py-3" style={{ color: "var(--teal)", fontWeight: 500 }}>{m.name}</td>
              <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{m.workspace}</td>
              <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{formatDate(m.last_refresh_at)}</td>
              <td className="px-4 py-3">
                {m.status ? (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{
                      background: m.status === "completed" ? "rgba(115,191,105,0.15)" : m.status === "failed" ? "rgba(242,73,92,0.15)" : "rgba(110,113,128,0.15)",
                      color: m.status === "completed" ? "var(--green)" : m.status === "failed" ? "var(--red)" : "var(--text-muted)",
                    }}
                  >
                    {m.status}
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
  );
}

type Tab = "testdata" | "refreshes" | "metrics" | "incidents";

export default function AdminTabs({ modelRefreshes }: { modelRefreshes: ModelRefresh[] }) {
  const [active, setActive] = useState<Tab>("testdata");

  return (
    <div>
      <div className="flex gap-1 border-b mb-6" style={{ borderColor: "var(--border)" }}>
        {([
          { id: "testdata", label: "Testdata" },
          { id: "refreshes", label: "Model refreshes" },
          { id: "metrics", label: "Metrics" },
          { id: "incidents", label: "Incident types" },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: active === id ? "var(--teal)" : "var(--text-muted)",
              borderBottom: active === id ? "2px solid var(--teal)" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {active === "testdata" && <AdminTable />}
      {active === "refreshes" && <ModelRefreshesTab modelRefreshes={modelRefreshes} />}
      {active === "metrics" && <MetricsList />}
      {active === "incidents" && <IncidentDictionary />}
    </div>
  );
}
