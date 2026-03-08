"use client";

import { useState } from "react";
import { Dataset, Incident } from "@/lib/types";
import SeverityBadge from "@/components/SeverityBadge";

const TABS = ["Runs", "Incident", "Analysis", "Suggested Fix"] as const;
type Tab = (typeof TABS)[number];

const COMING_SOON: Tab[] = ["Analysis", "Suggested Fix"];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const incidentTypeLabel: Record<string, string> = {
  refresh_failed: "Refresh mislukt",
  refresh_delayed: "Refresh vertraagd",
  schema_change: "Schema wijziging",
};

interface Props {
  dataset: Dataset;
  activeIncidents: Incident[];
  allIncidents: Incident[];
}

export default function PipelineTabs({ dataset, activeIncidents, allIncidents }: Props) {
  const [active, setActive] = useState<Tab>("Runs");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className="px-4 py-2 text-sm font-medium transition-colors relative"
            style={{
              color: active === tab ? "var(--teal)" : "var(--text-muted)",
              borderBottom: active === tab ? "2px solid var(--teal)" : "2px solid transparent",
            }}
          >
            {tab}
            {tab === "Incident" && activeIncidents.length > 0 && (
              <span
                className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(242,73,92,0.2)", color: "var(--red)" }}
              >
                {activeIncidents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "Runs" && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Tijdstip</th>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
                  {formatDate(dataset.last_refresh_at)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{
                      background: dataset.refresh_status === "completed"
                        ? "rgba(115,191,105,0.15)"
                        : dataset.refresh_status === "failed"
                        ? "rgba(242,73,92,0.15)"
                        : "rgba(110,113,128,0.15)",
                      color: dataset.refresh_status === "completed"
                        ? "var(--green)"
                        : dataset.refresh_status === "failed"
                        ? "var(--red)"
                        : "var(--gray)",
                    }}
                  >
                    {dataset.refresh_status}
                  </span>
                </td>
              </tr>
              {dataset.last_refresh_at === null && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                    Geen refresh history beschikbaar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {active === "Incident" && (
        <div className="space-y-4">
          {activeIncidents.length === 0 ? (
            <div
              className="rounded-lg border px-6 py-8 text-center"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Geen actieve incidents voor deze pipeline.
              </p>
            </div>
          ) : (
            activeIncidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded-lg border p-5"
                style={{
                  borderColor: incident.severity === "critical" ? "rgba(242,73,92,0.4)" : "rgba(250,222,42,0.3)",
                  background: "var(--surface)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={incident.severity} />
                    <span className="font-medium text-sm">{incidentTypeLabel[incident.type] ?? incident.type}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Gedetecteerd: {formatDate(incident.detected_at)}
                  </span>
                </div>
                {incident.root_cause_hint && (
                  <div
                    className="rounded-md px-4 py-3 mb-3 border-l-2 text-sm"
                    style={{
                      background: "rgba(0,180,216,0.06)",
                      borderColor: "var(--teal)",
                      color: "var(--text)",
                    }}
                  >
                    <span className="font-medium" style={{ color: "var(--teal)" }}>Root cause hint</span>
                    <p className="mt-1" style={{ color: "var(--text-muted)" }}>{incident.root_cause_hint}</p>
                  </div>
                )}
                {incident.detail && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{incident.detail}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {COMING_SOON.includes(active) && (
        <div
          className="rounded-lg border px-6 py-12 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Coming soon</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {active === "Analysis" && "Patronen en trends over meerdere runs — beschikbaar in fase 2."}
            {active === "Suggested Fix" && "Concrete acties om het incident op te lossen — beschikbaar in fase 2."}
          </p>
        </div>
      )}
    </div>
  );
}
