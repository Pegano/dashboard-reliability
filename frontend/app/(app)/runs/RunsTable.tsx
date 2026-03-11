"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RefreshRunWithDataset, Incident } from "@/lib/types";

function fmtMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

interface DurationPt { id: string; ms: number; status: string; ts: number; label: string; }

function buildPoints(runs: RefreshRunWithDataset[]): DurationPt[] {
  return runs
    .filter((r) => r.started_at && r.ended_at)
    .map((r) => ({
      id: r.id,
      ms: new Date(r.ended_at!).getTime() - new Date(r.started_at!).getTime(),
      status: r.status,
      ts: new Date(r.ended_at!).getTime(),
      label: new Date(r.ended_at!).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" }),
    }))
    .sort((a, b) => a.ts - b.ts);
}

function DurationModal({ pts, currentId, onClose }: { pts: DurationPt[]; currentId: string; onClose: () => void }) {
  const W = 720, H = 270, PAD_L = 48, PAD_R = 16, PAD_T = 16, PAD_B = 32;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const R = 4;

  const durations = pts.map((p) => p.ms);
  const minMs = Math.min(...durations);
  const maxMs = Math.max(...durations);
  const range = maxMs - minMs || 1;
  const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
  const n = pts.length;
  const toX = (i: number) => PAD_L + (i / (n - 1)) * plotW;
  const toY = (ms: number) => PAD_T + plotH - ((ms - minMs) / range) * plotH;
  const avgY = toY(avgMs);

  const labelIndices = [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1]
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const yTicks = [
    { ms: minMs, label: fmtMs(minMs) },
    { ms: avgMs, label: fmtMs(avgMs) },
    { ms: maxMs, label: fmtMs(maxMs) },
  ];
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", width: W + 56, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Duration history</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <svg width={W} height={H}>
          {yTicks.map((t) => {
            const y = toY(t.ms);
            return (
              <g key={t.label}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
                <text x={PAD_L - 6} y={y + 4} fontSize={9} fill="var(--text-muted)" textAnchor="end">{t.label}</text>
              </g>
            );
          })}
          <line x1={PAD_L} y1={avgY} x2={W - PAD_R} y2={avgY} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="4 3" />
          {labelIndices.map((i) => (
            <text key={i} x={toX(i)} y={H - 6} fontSize={9} fill="var(--text-muted)" textAnchor="middle">{pts[i].label}</text>
          ))}
          {pts.map((p, i) => {
            const isCurrent = p.id === currentId;
            const isHovered = hovered === i;
            return (
              <circle key={i} cx={toX(i)} cy={toY(p.ms)}
                r={isCurrent ? R + 1.5 : isHovered ? R + 1 : R}
                fill={isCurrent ? "var(--red)" : p.status === "completed" ? "var(--teal)" : p.status === "failed" ? "rgba(242,73,92,0.8)" : "var(--text-muted)"}
                opacity={isCurrent ? 1 : 0.6}
                style={{ cursor: "default" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          {hovered !== null && (() => {
            const p = pts[hovered];
            const x = toX(hovered);
            const y = toY(p.ms);
            const tipX = x + 8 > W - 80 ? x - 90 : x + 8;
            return (
              <g>
                <rect x={tipX} y={y - 22} width={82} height={18} rx={3} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} />
                <text x={tipX + 6} y={y - 9} fontSize={10} fill="var(--text)">{fmtMs(p.ms)} · {p.label}</text>
              </g>
            );
          })()}
        </svg>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          {[{ color: "var(--teal)", label: "Completed" }, { color: "var(--red)", label: "This run" }, { color: "rgba(242,73,92,0.8)", label: "Failed" }].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
            <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="4 3" /></svg>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Average</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DurationCell({ run, allRuns }: { run: RefreshRunWithDataset; allRuns: RefreshRunWithDataset[] }) {
  const [open, setOpen] = useState(false);
  const label = formatDuration(run.started_at, run.ended_at);
  const modelRuns = useMemo(() => allRuns.filter((r) => r.dataset_id === run.dataset_id), [allRuns, run.dataset_id]);
  const pts = useMemo(() => buildPoints(modelRuns), [modelRuns]);
  const clickable = pts.length >= 2 && label !== "—";

  return (
    <>
      <span
        onClick={clickable ? (e) => { e.stopPropagation(); setOpen(true); } : undefined}
        style={{
          cursor: clickable ? "pointer" : "default",
          textDecoration: clickable ? "underline" : "none",
          textDecorationColor: "rgba(255,255,255,0.25)",
          textUnderlineOffset: 3,
        }}
      >
        {label}
      </span>
      {open && <DurationModal pts={pts} currentId={run.id} onClose={() => setOpen(false)} />}
    </>
  );
}

type StatusFilter = "all" | "completed" | "failed" | "other";
type DateFilter = "all" | "today" | "yesterday" | "7days";

const RUN_STATUS_COLOR: Record<string, string> = {
  completed: "var(--green)",
  failed:    "var(--red)",
  unknown:   "var(--text-muted)",
  disabled:  "var(--text-muted)",
  cancelled: "var(--yellow)",
};

const RUN_STATUS_BG: Record<string, string> = {
  completed: "rgba(115,191,105,0.15)",
  failed:    "rgba(242,73,92,0.15)",
  unknown:   "rgba(110,113,128,0.15)",
  disabled:  "rgba(110,113,128,0.15)",
  cancelled: "rgba(250,176,5,0.15)",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

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

function formatRefreshType(type: string | null): { label: string; title: string; manual: boolean } {
  switch (type) {
    case "Scheduled":       return { label: "Scheduled", title: "Triggered by schedule",                  manual: false };
    case "OnDemand":        return { label: "Manual",    title: "Triggered manually in Power BI",         manual: true  };
    case "ViaApi":          return { label: "API",       title: "Triggered via Power BI REST API",        manual: true  };
    case "ViaEnhancedApi":  return { label: "API+",      title: "Triggered via Enhanced Refresh API",     manual: true  };
    case "ViaXmlaEndpoint": return { label: "XMLA",      title: "Triggered via XMLA endpoint",            manual: true  };
    default:                return { label: "—",         title: "",                                       manual: false };
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

interface Props {
  runs: RefreshRunWithDataset[];
  activeIncidents: Incident[];
}

export default function RunsTable({ runs, activeIncidents }: Props) {
  const incidentMap = useMemo(() => {
    const map: Record<string, { severity: "critical" | "warning"; detected_at: string }> = {};
    for (const i of activeIncidents) {
      if (!map[i.dataset_id] || i.severity === "critical") {
        map[i.dataset_id] = { severity: i.severity, detected_at: i.detected_at };
      }
    }
    return map;
  }, [activeIncidents]);
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [modelSearch, setModelSearch] = useState<string>("");

  const modelNames = useMemo(() => {
    return Array.from(new Set(runs.map((r) => r.dataset_name))).sort();
  }, [runs]);

  const counts = useMemo(() => ({
    all:       runs.length,
    completed: runs.filter((r) => r.status === "completed").length,
    failed:    runs.filter((r) => r.status === "failed").length,
    other:     runs.filter((r) => r.status !== "completed" && r.status !== "failed").length,
  }), [runs]);

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart     = startOfDay(now);
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const sevenDaysStart = new Date(todayStart.getTime() - 6 * 86400000);
    const search = modelSearch.trim().toLowerCase();

    return runs.filter((r) => {
      if (statusFilter === "completed" && r.status !== "completed") return false;
      if (statusFilter === "failed"    && r.status !== "failed")    return false;
      if (statusFilter === "other"     && (r.status === "completed" || r.status === "failed")) return false;

      if (dateFilter !== "all") {
        const t = r.ended_at ? new Date(r.ended_at) : null;
        if (!t) return false;
        if (dateFilter === "today"     && t < todayStart)                          return false;
        if (dateFilter === "yesterday" && (t < yesterdayStart || t >= todayStart)) return false;
        if (dateFilter === "7days"     && t < sevenDaysStart)                      return false;
      }

      if (search && !r.dataset_name.toLowerCase().includes(search)) return false;

      return true;
    });
  }, [runs, statusFilter, dateFilter, modelSearch]);

  function handleRowClick(run: RefreshRunWithDataset) {
    router.push(`/pipelines/${run.dataset_id}?tab=Runs`);
  }

  function errorText(run: RefreshRunWithDataset): string | null {
    if (run.status === "completed") return null;
    if (run.error_description) {
      const clean = run.error_description.replace(/<\/?oii>/g, "");
      return clean.length > 90 ? clean.slice(0, 90) + "…" : clean;
    }
    if (run.error_code) return run.error_code;
    return null;
  }

  const statusCards: { key: StatusFilter; label: string; color: string; borderColor: string }[] = [
    { key: "all",       label: "All",       color: "var(--teal)",   borderColor: "rgba(0,180,216,0.6)" },
    { key: "completed", label: "Completed", color: "var(--green)",  borderColor: "rgba(115,191,105,0.6)" },
    { key: "failed",    label: "Failed",    color: "var(--red)",    borderColor: "rgba(242,73,92,0.6)" },
    { key: "other",     label: "Other",     color: "var(--yellow)", borderColor: "rgba(250,176,5,0.6)" },
  ];

  return (
    <div>
      {/* Status filter cards */}
      <div className="flex gap-3 mb-6">
        {statusCards.map(({ key, label, color, borderColor }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors"
            style={{
              background: "var(--surface)",
              borderColor: statusFilter === key ? borderColor : "var(--border)",
              cursor: "pointer",
            }}
          >
            <span
              className="rounded-full inline-block flex-shrink-0"
              style={{ width: 10, height: 10, background: color, boxShadow: `0 0 6px ${color}88` }}
            />
            <span className="text-2xl font-semibold" style={{ color: "var(--text)" }}>{counts[key]}</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Date + model filters */}
      <div className="flex flex-wrap gap-4 mb-5 items-center">
        <div className="flex gap-1.5">
          {(["today", "yesterday", "7days", "all"] as DateFilter[]).map((d) => {
            const label = d === "7days" ? "7 days" : d.charAt(0).toUpperCase() + d.slice(1);
            const active = dateFilter === d;
            return (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: active ? "rgba(0,180,216,0.12)" : "var(--surface)",
                  color:      active ? "var(--teal)" : "var(--text-muted)",
                  border:     `1px solid ${active ? "var(--teal)" : "var(--border)"}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={`Filter model… (${modelNames.length})`}
            value={modelSearch}
            onChange={(e) => setModelSearch(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              outline: "none",
              width: 180,
            }}
          />
          {modelSearch && (
            <button
              onClick={() => setModelSearch("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", fontSize: 12, lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Timestamp</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Model</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Workspace</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Trigger</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Issues</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Duration</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Error</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No runs match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((run) => {
                const err = errorText(run);
                const incident = incidentMap[run.dataset_id];
                const showIncident = incident && run.ended_at
                  && new Date(run.ended_at) >= new Date(new Date(incident.detected_at).getTime() - 15 * 60 * 1000);
                const trigger = formatRefreshType(run.refresh_type);
                return (
                  <tr
                    key={run.id}
                    onClick={() => handleRowClick(run)}
                    className="border-b transition-colors cursor-pointer"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      {formatDate(run.ended_at)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--teal)", fontWeight: 500 }}>
                      {run.dataset_name}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      {run.workspace_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs"
                        title={trigger.title}
                        style={{ color: trigger.manual ? "var(--text)" : "var(--text-muted)" }}
                      >
                        {trigger.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {showIncident ? (
                        <a
                          href={`/pipelines/${run.dataset_id}?tab=issues`}
                          onClick={(e) => e.stopPropagation()}
                          title={incident.severity === "critical" ? "Active critical incident" : "Active warning"}
                          style={{ fontSize: 10, lineHeight: 1 }}
                        >
                          <span style={{
                            color: incident.severity === "critical" ? "var(--red)" : "var(--yellow)",
                            filter: incident.severity === "critical" ? "drop-shadow(0 0 3px var(--red))" : "drop-shadow(0 0 3px var(--yellow))",
                          }}>▲</span>
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      <DurationCell run={run} allRuns={runs} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: RUN_STATUS_BG[run.status]  ?? RUN_STATUS_BG.unknown,
                          color:      RUN_STATUS_COLOR[run.status] ?? "var(--text-muted)",
                        }}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {err ? (
                        <span className="text-xs" style={{ color: "var(--red)" }}>{err}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          {filtered.length} run{filtered.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
