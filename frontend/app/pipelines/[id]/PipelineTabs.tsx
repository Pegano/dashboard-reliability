"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { Dataset, DatasetHealth, Datasource, Incident, Report, RefreshRun } from "@/lib/types";
import SeverityBadge from "@/components/SeverityBadge";
import { suppressIncident } from "@/lib/api";

const TABS = ["Runs", "Issues", "Analysis", "Fix"] as const;
type Tab = (typeof TABS)[number];


function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const incidentTypeLabel: Record<string, string> = {
  refresh_failed: "Refresh failed",
  refresh_delayed: "Refresh delayed",
  schema_change: "Schema change",
  refresh_slow: "Slow refresh",
  dataset_growth: "Dataset growth",
};

function formatDuration(started_at: string | null, ended_at: string | null): string {
  if (!started_at || !ended_at) return "—";
  const diffMs = new Date(ended_at).getTime() - new Date(started_at).getTime();
  if (diffMs < 0) return "—";
  const totalSeconds = Math.round(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

interface Props {
  dataset: Dataset;
  health: DatasetHealth;
  activeIncidents: Incident[];
  allIncidents: Incident[];
  reports: Report[];
  runs: RefreshRun[];
  defaultTab?: Tab;
  focusIncidentId?: string;
}

export default function PipelineTabs({ dataset, health, activeIncidents, allIncidents, reports, runs, defaultTab, focusIncidentId }: Props) {
  const [active, setActive] = useState<Tab>(defaultTab ?? "Runs");
  const [focusId, setFocusId] = useState<string | undefined>(focusIncidentId);

  function switchTab(tab: Tab) {
    setActive(tab);
    setFocusId(undefined); // clear focus when switching tabs manually
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className="px-4 py-2 text-sm font-medium transition-colors relative"
            style={{
              color: active === tab ? "var(--teal)" : "var(--text-muted)",
              borderBottom: active === tab ? "2px solid var(--teal)" : "2px solid transparent",
            }}
          >
            {tab}
            {tab === "Issues" && activeIncidents.length > 0 && (
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
                <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Timestamp</th>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Duration</th>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.length > 0 ? (
                runs.map((run) => (
                  <tr key={run.id} className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
                      {formatDate(run.ended_at)}
                    </td>
                    <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
                      {formatDuration(run.started_at, run.ended_at)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: run.status === "completed"
                            ? "rgba(115,191,105,0.15)"
                            : run.status === "failed"
                            ? "rgba(242,73,92,0.15)"
                            : "rgba(110,113,128,0.15)",
                          color: run.status === "completed"
                            ? "var(--green)"
                            : run.status === "failed"
                            ? "var(--red)"
                            : "var(--gray)",
                        }}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
                      {run.status === "failed" && run.error_description ? (
                        <span className="text-xs" style={{ color: "var(--red)" }}>
                          {(() => { const clean = run.error_description.replace(/<\/?oii>/g, ""); return clean.length > 80 ? clean.slice(0, 80) + "…" : clean; })()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {dataset.last_refresh_at !== null ? (
                    <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>
                        {formatDate(dataset.last_refresh_at)}
                      </td>
                      <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>—</td>
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
                      <td className="px-4 py-4" style={{ color: "var(--text-muted)" }}>—</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                        No refresh history available.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {active === "Issues" && (
        <div className="space-y-4">
          {/* Geraakt rapporten */}
          {reports.length > 0 && (
            <div
              className="rounded-lg border px-5 py-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                AFFECTED REPORTS ({reports.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {reports.map((r) => (
                  r.web_url ? (
                    <a
                      key={r.id}
                      href={r.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-70"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    >
                      {r.name} ↗
                    </a>
                  ) : (
                    <span
                      key={r.id}
                      className="text-xs px-2 py-1 rounded border"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    >
                      {r.name}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Active incidents */}
          {activeIncidents.length === 0 && allIncidents.filter((i) => i.status === "suppressed").length === 0 ? (
            <div
              className="rounded-lg border px-6 py-8 text-center"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No active issues for this model.
              </p>
            </div>
          ) : (
            activeIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))
          )}

          {/* Suppressed incidents */}
          {allIncidents.filter((i) => i.status === "suppressed").length > 0 && (
            <div className="mt-4">
              <div className="space-y-3">
                {allIncidents.filter((i) => i.status === "suppressed").map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            </div>
          )}

          {/* Resolved incidents (history) */}
          {allIncidents.filter((i) => i.status === "resolved").length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Resolved
              </p>
              <div className="space-y-3">
                {allIncidents.filter((i) => i.status === "resolved").map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} resolved />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {active === "Analysis" && (
        <AnalysisTab runs={runs} />
      )}

      {active === "Fix" && (
        <FixTab activeIncidents={activeIncidents} health={health} runs={runs} focusIncidentId={focusId} />
      )}
    </div>
  );
}

function IncidentCard({ incident, resolved = false, datasetId }: { incident: Incident; resolved?: boolean; datasetId?: string }) {
  const router = useRouter();
  const params = useParams();
  const dsId = datasetId ?? (params?.id as string);
  const [isPending, startTransition] = useTransition();
  const suppressed = incident.status === "suppressed";

  function handleSuppress() {
    startTransition(async () => {
      await suppressIncident(incident.id, 24);
      router.refresh();
    });
  }

  const borderColor = resolved || suppressed
    ? "var(--border)"
    : incident.severity === "critical"
    ? "rgba(242,73,92,0.4)"
    : "rgba(250,222,42,0.3)";

  const cardContent = (
    <div
      className="rounded-lg border p-5"
      style={{
        borderColor,
        background: "var(--surface)",
        opacity: resolved || suppressed ? 0.6 : 1,
        cursor: !resolved && !suppressed ? "pointer" : "default",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={incident.severity} />
          <span className="font-medium text-sm">{incidentTypeLabel[incident.type] ?? incident.type}</span>
          {resolved && (
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: "rgba(115,191,105,0.15)", color: "var(--green)" }}>
              Resolved
            </span>
          )}
          {suppressed && (
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: "rgba(110,113,128,0.15)", color: "var(--text-muted)" }}>
              Suppressed until {formatDate(incident.suppressed_until)}
            </span>
          )}
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right text-xs" style={{ color: "var(--text-muted)" }}>
            <div>Detected: {formatDate(incident.detected_at)}</div>
            {resolved && incident.resolved_at && (
              <div>Resolved: {formatDate(incident.resolved_at)}</div>
            )}
          </div>
          {!resolved && !suppressed && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSuppress(); }}
              disabled={isPending}
              className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "transparent" }}
            >
              Suppress 24h
            </button>
          )}
        </div>
      </div>
      {incident.root_cause_hint && (
        <div
          className="rounded-md px-4 py-3 mb-3 border-l-2 text-sm"
          style={{ background: "rgba(0,180,216,0.06)", borderColor: "var(--teal)", color: "var(--text)" }}
        >
          <span className="font-medium" style={{ color: "var(--teal)" }}>Root cause hint</span>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>{incident.root_cause_hint}</p>
        </div>
      )}
      {incident.detail && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{incident.detail}</p>
      )}
    </div>
  );

  if (!resolved && !suppressed) {
    return (
      <a href={`/pipelines/${dsId}?tab=fix&incident=${incident.id}`} style={{ display: "block", textDecoration: "none" }}>
        {cardContent}
      </a>
    );
  }

  return cardContent;
}

function fmtMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function AnalysisTab({ runs }: { runs: RefreshRun[] }) {
  if (runs.length === 0) {
    return (
      <div
        className="rounded-lg border px-6 py-12 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No run data available for analysis.</p>
      </div>
    );
  }

  // Chronological order (oldest first) for all charts
  const chronological = [...runs].reverse();

  const total = runs.length;
  const completed = runs.filter((r) => r.status === "completed").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const withDuration = runs.filter((r) => r.started_at && r.ended_at).map((r) => ({
    ...r,
    durationMs: new Date(r.ended_at!).getTime() - new Date(r.started_at!).getTime(),
  }));
  const durations = withDuration.map((r) => r.durationMs);
  const avgMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const maxMs = durations.length > 0 ? Math.max(...durations) : null;
  const minMs = durations.length > 0 ? Math.min(...durations) : null;

  // Weekly buckets (last 4 weeks)
  const now = Date.now();
  const weeks = [0, 1, 2, 3].map((w) => {
    const weekStart = now - (w + 1) * 7 * 24 * 3600 * 1000;
    const weekEnd = now - w * 7 * 24 * 3600 * 1000;
    const weekRuns = runs.filter((r) => {
      const t = r.ended_at ? new Date(r.ended_at).getTime() : 0;
      return t >= weekStart && t < weekEnd;
    });
    const weekFailed = weekRuns.filter((r) => r.status === "failed").length;
    return {
      label: w === 0 ? "This week" : w === 1 ? "Last week" : `${w + 1}w ago`,
      total: weekRuns.length,
      failed: weekFailed,
      rate: weekRuns.length > 0 ? Math.round((weekFailed / weekRuns.length) * 100) : null,
    };
  }).reverse();

  // Duration trend: group by day, avg duration per day (last 14 days)
  const durationByDay: Record<string, number[]> = {};
  withDuration.forEach((r) => {
    const day = r.ended_at!.slice(0, 10);
    const daysAgo = Math.floor((now - new Date(day).getTime()) / (24 * 3600 * 1000));
    if (daysAgo <= 14) {
      if (!durationByDay[day]) durationByDay[day] = [];
      durationByDay[day].push(r.durationMs);
    }
  });
  const durationDays = Object.entries(durationByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, durs]) => ({
      day: day.slice(5), // MM-DD
      avgMs: durs.reduce((a, b) => a + b, 0) / durs.length,
    }));
  const maxDayMs = durationDays.length > 0 ? Math.max(...durationDays.map((d) => d.avgMs)) : 1;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total runs", value: String(total) },
          { label: "Success rate", value: `${successRate}%`, highlight: successRate < 80 ? "red" : successRate < 95 ? "yellow" : null },
          { label: "Avg duration", value: avgMs !== null ? fmtMs(avgMs) : "—" },
          { label: "Failures", value: String(failed), highlight: failed > 0 ? "red" : null },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className="rounded-lg border px-5 py-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p
              className="text-2xl font-semibold"
              style={{ color: highlight === "red" ? "var(--red)" : highlight === "yellow" ? "var(--yellow)" : "var(--text)" }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Run history — full timeline */}
      <div
        className="rounded-lg border px-5 py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>
          RUN HISTORY ({chronological.length} runs, oldest → newest)
        </p>
        <div className="flex gap-1 items-end flex-wrap">
          {chronological.map((run) => {
            const color = run.status === "completed" ? "var(--green)" : run.status === "failed" ? "var(--red)" : "var(--text-muted)";
            const durationMs = run.started_at && run.ended_at
              ? new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()
              : null;
            const height = durationMs && maxMs ? Math.max(4, Math.round((durationMs / maxMs) * 32)) : 8;
            return (
              <div
                key={run.id}
                title={`${run.status} — ${formatDate(run.ended_at)}${durationMs ? ` — ${fmtMs(durationMs)}` : ""}`}
                style={{
                  width: 6,
                  height,
                  borderRadius: 2,
                  background: color,
                  flexShrink: 0,
                  opacity: 0.85,
                }}
              />
            );
          })}
        </div>
        <div className="flex gap-4 mt-3">
          {[
            { color: "var(--green)", label: "Completed" },
            { color: "var(--red)", label: "Failed" },
            { color: "var(--text-muted)", label: "Other" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
          {maxMs && <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>Bar height = duration</span>}
        </div>
      </div>

      {/* Weekly failure rate */}
      <div
        className="rounded-lg border px-5 py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-xs font-medium mb-4" style={{ color: "var(--text-muted)" }}>FAILURE RATE PER WEEK</p>
        <div className="flex gap-4">
          {weeks.map((w) => {
            const rate = w.rate ?? 0;
            const color = rate === 0 ? "var(--green)" : rate < 30 ? "var(--yellow)" : "var(--red)";
            return (
              <div key={w.label} className="flex-1">
                <div className="flex items-end mb-2" style={{ height: 40 }}>
                  <div
                    style={{
                      width: "100%",
                      height: w.total === 0 ? 2 : Math.max(3, Math.round((rate / 100) * 40)),
                      background: w.total === 0 ? "var(--border)" : color,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <p className="text-xs font-semibold" style={{ color: w.total === 0 ? "var(--text-muted)" : color }}>
                  {w.total === 0 ? "—" : `${rate}%`}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{w.label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{w.total} runs</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Duration trend */}
      {durationDays.length > 1 && (
        <div
          className="rounded-lg border px-5 py-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>DURATION TREND (last 14 days, avg per day)</p>
          <div className="flex gap-1 items-end mt-3" style={{ height: 48 }}>
            {durationDays.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  title={`${d.day}: avg ${fmtMs(d.avgMs)}`}
                  style={{
                    width: "100%",
                    height: Math.max(3, Math.round((d.avgMs / maxDayMs) * 44)),
                    background: "var(--teal)",
                    borderRadius: 2,
                    opacity: 0.7,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{durationDays[0]?.day}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              min {minMs !== null ? fmtMs(minMs) : "—"} · avg {avgMs !== null ? fmtMs(avgMs) : "—"} · max {maxMs !== null ? fmtMs(maxMs) : "—"}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{durationDays[durationDays.length - 1]?.day}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function datasourceLabel(ds: Datasource): string {
  const conn = ds.connection;
  if (ds.type === "Sql") return `SQL Server — ${conn.server ?? ""}${conn.database ? ` / ${conn.database}` : ""}`;
  if (ds.type === "File") return `File — ${conn.path ?? ""}`;
  if (ds.type === "Web") return `Web — ${conn.url ?? ""}`;
  if (ds.type === "OData") return `OData — ${conn.url ?? ""}`;
  if (ds.type === "SharePoint") return `SharePoint — ${conn.url ?? ""}`;
  if (ds.type === "AzureBlobs") return `Azure Blob — ${conn.accountDomain ?? ""}`;
  if (ds.type === "AnalysisServices") return `Analysis Services — ${conn.server ?? ""}`;
  const connStr = Object.values(conn).filter(Boolean).join(" / ");
  return connStr ? `${ds.type} — ${connStr}` : ds.type;
}

function errorCodeHint(errorCode: string | null): string | null {
  if (!errorCode) return null;
  const hints: Record<string, string> = {
    DataSourceError: "The data source returned an error. Check the source system — it may be unavailable or have rejected the connection.",
    CredentialsExpired: "The credentials used to connect to the data source have expired. Update them in the dataset settings.",
    GatewayTimeout: "The on-premise data gateway timed out. Check if the gateway service is running and the source is reachable.",
    QueryTimeout: "The query to the data source timed out. The source system may be under load, or the query needs optimisation.",
    ConnectionTimeout: "The connection to the data source timed out. Check network connectivity and firewall rules.",
    AccessDenied: "Access to the data source was denied. Verify the account permissions on the source system.",
    InvalidCredentials: "The credentials are invalid. Re-enter them in the dataset settings.",
    DmError: "A data model error occurred. Check the Power Query steps for transformation errors.",
  };
  return hints[errorCode] ?? null;
}

function FixTab({ activeIncidents, health, runs, focusIncidentId }: { activeIncidents: Incident[]; health: DatasetHealth; runs: RefreshRun[]; focusIncidentId?: string }) {
  const visibleIncidents = focusIncidentId
    ? activeIncidents.filter((i) => i.id === focusIncidentId)
    : activeIncidents;

  if (activeIncidents.length === 0) {
    return (
      <div
        className="rounded-lg border px-6 py-12 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active issues — nothing to fix.</p>
      </div>
    );
  }

  const gatewayUrl = `https://app.powerbi.com/gateways`;
  const datasources = health.datasources ?? [];
  const hasGateway = datasources.some((s) => s.gatewayId);
  // Use the API-provided webUrl — works for both classic Power BI and Fabric workspaces
  const datasetUrl = health.web_url ?? null;

  // Most recent failed run error code
  const lastFailedRun = runs.find((r) => r.status === "failed");
  const errorCode = lastFailedRun?.error_code ?? null;
  const errorCodeHintText = errorCodeHint(errorCode);

  return (
    <div className="space-y-5">
{visibleIncidents.length === 0 && focusIncidentId && (
        <div
          className="rounded-lg border px-6 py-8 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>This issue has been resolved or suppressed.</p>
        </div>
      )}
      {visibleIncidents.map((incident) => {
        const borderColor = incident.severity === "critical" ? "rgba(242,73,92,0.4)" : "rgba(250,222,42,0.3)";

        return (
          <div
            key={incident.id}
            className="rounded-lg border p-5 space-y-4"
            style={{ borderColor, background: "var(--surface)" }}
          >
            <div className="flex items-center gap-3">
              <SeverityBadge severity={incident.severity} />
              <span className="font-medium text-sm" style={{ color: "var(--text)" }}>
                {incidentTypeLabel[incident.type] ?? incident.type}
              </span>
            </div>

            {/* Schema change: show removed columns + solution */}
            {incident.type === "schema_change" && incident.detail && (
              <div>
                <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Removed columns
                </p>
                <div className="space-y-1">
                  {incident.detail.replace("Removed columns: ", "").split(", ").map((col) => (
                    <div key={col} className="flex items-center gap-2 text-sm font-mono" style={{ color: "var(--text)" }}>
                      <span style={{ color: "var(--red)", fontSize: 11 }}>−</span>
                      <span>{col}</span>
                    </div>
                  ))}
                </div>
                <div
                  className="rounded-md px-4 py-3 mt-3 border-l-2 text-sm"
                  style={{ background: "rgba(242,73,92,0.05)", borderColor: "var(--red)", color: "var(--text-muted)" }}
                >
                  <span className="font-medium" style={{ color: "var(--red)" }}>Solution direction</span>
                  <p className="mt-1">Restore the removed column(s) in Power BI Desktop and republish the model, or update all reports and measures that reference these columns.</p>
                </div>
              </div>
            )}

            {/* Where in the data chain (non-schema_change) */}
            {incident.type !== "schema_change" && datasources.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Data chain
                </p>
                <div className="space-y-1">
                  {datasources.map((src, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>SOURCE</span>
                      <span>{datasourceLabel(src)}</span>
                      {src.gatewayId && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(110,113,128,0.15)", color: "var(--text-muted)" }}>
                          via gateway
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>MODEL</span>
                    <span>{health.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error code hint */}
            {incident.type === "refresh_failed" && errorCodeHintText && (
              <div
                className="rounded-md px-4 py-3 border-l-2 text-sm"
                style={{ background: "rgba(242,73,92,0.05)", borderColor: "var(--red)", color: "var(--text-muted)" }}
              >
                <span className="font-medium" style={{ color: "var(--red)" }}>{errorCode}</span>
                <p className="mt-1">{errorCodeHintText}</p>
              </div>
            )}

            {/* Schedule hint */}
            {incident.type === "refresh_delayed" && health.refresh_schedule_enabled === false && (
              <div
                className="rounded-md px-4 py-3 border-l-2 text-sm"
                style={{ background: "rgba(250,222,42,0.05)", borderColor: "var(--yellow)", color: "var(--text-muted)" }}
              >
                <span className="font-medium" style={{ color: "var(--yellow)" }}>Refresh schedule is disabled</span>
                <p className="mt-1">The scheduled refresh is turned off in Power BI. Enable it in the dataset settings.</p>
              </div>
            )}

            {/* Action links */}
            <div>
              <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Where to fix it
              </p>
              <div className="flex flex-wrap gap-2">
                {datasetUrl && (
                  <a
                    href={datasetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded border transition-opacity hover:opacity-70"
                    style={{ borderColor: "var(--teal)", color: "var(--teal)", background: "rgba(0,180,216,0.06)" }}
                  >
                    Open in Power BI ↗
                  </a>
                )}
                {hasGateway && (
                  <a
                    href={gatewayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded border transition-opacity hover:opacity-70"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg)" }}
                  >
                    Gateway settings ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
