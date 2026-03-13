"use client";

import { useState } from "react";
import { DataflowRun, DataflowEntity } from "@/lib/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const secs = Math.round(ms / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
}

function entityDurationMs(entity: DataflowEntity): number | null {
  if (!entity.startTime || !entity.endTime) return null;
  return new Date(entity.endTime).getTime() - new Date(entity.startTime).getTime();
}

function EntityStatusColor(status: string | null): string {
  const s = (status || "").toLowerCase();
  if (s === "success") return "var(--green)";
  if (s === "failed" || s === "error") return "var(--red)";
  if (s === "cancelled") return "var(--yellow)";
  return "var(--text-muted)";
}

function RunStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const color = s === "success" ? "var(--green)" : s === "failed" ? "var(--red)" : s === "cancelled" ? "var(--yellow)" : "var(--text-muted)";
  const bg = s === "success" ? "rgba(0,200,100,0.1)" : s === "failed" ? "rgba(255,80,80,0.1)" : s === "cancelled" ? "rgba(255,180,0,0.1)" : "rgba(120,120,120,0.1)";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ color, background: bg }}
    >
      {status}
    </span>
  );
}

function FlowDiagram({ run }: { run: DataflowRun }) {
  const entities = run.entities || [];
  if (entities.length === 0) {
    return (
      <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
        No entity detail available for this run.
      </p>
    );
  }

  const totalDuration = run.duration_ms;
  const maxEntityMs = Math.max(...entities.map(e => entityDurationMs(e) || 0), 1);

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        Flow — {entities.length} entit{entities.length !== 1 ? "ies" : "y"}
      </p>
      {entities.map((entity, i) => {
        const durationMs = entityDurationMs(entity);
        const barWidth = durationMs !== null ? Math.max(4, (durationMs / maxEntityMs) * 100) : 4;
        const statusColor = EntityStatusColor(entity.status);
        const isFailed = (entity.status || "").toLowerCase() === "failed" || (entity.status || "").toLowerCase() === "error";

        return (
          <div key={i} className="flex items-center gap-3">
            {/* Step number */}
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                background: isFailed ? "rgba(255,80,80,0.15)" : "rgba(255,255,255,0.05)",
                color: statusColor,
                border: `1px solid ${statusColor}`,
              }}
            >
              {i + 1}
            </span>

            {/* Entity name */}
            <span
              className="flex-shrink-0 text-sm w-48 truncate"
              style={{ color: isFailed ? "var(--red)" : "var(--text)" }}
              title={entity.name || ""}
            >
              {entity.name || "—"}
            </span>

            {/* Duration bar */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${barWidth}%`,
                    background: statusColor,
                    opacity: durationMs === null ? 0.3 : 1,
                  }}
                />
              </div>
              <span className="flex-shrink-0 text-xs w-12 text-right" style={{ color: "var(--text-muted)" }}>
                {formatDuration(durationMs)}
              </span>
            </div>

            {/* Error hint */}
            {isFailed && entity.error && (
              <span className="flex-shrink-0 text-xs max-w-xs truncate" style={{ color: "var(--red)" }} title={entity.error}>
                {entity.error}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DataflowDetail({ runs }: { runs: DataflowRun[] }) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    runs.length > 0 ? runs[0].id : null
  );

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;

  if (runs.length === 0) {
    return (
      <div
        className="rounded-lg p-12 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No runs recorded yet. Run history will appear here after the dataflow has been executed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "340px 1fr" }}>
      {/* Run list */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--surface)", height: "fit-content" }}
      >
        <div className="px-4 py-3 border-b text-xs font-medium uppercase tracking-wide" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          Run history ({runs.length})
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {runs.map((run) => {
            const isSelected = run.id === selectedRunId;
            return (
              <button
                key={run.id}
                onClick={() => setSelectedRunId(run.id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  background: isSelected ? "rgba(0,180,216,0.08)" : "transparent",
                  borderLeft: isSelected ? "2px solid var(--teal)" : "2px solid transparent",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <RunStatusBadge status={run.status} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDuration(run.duration_ms)}
                  </span>
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatDate(run.started_at)}
                </div>
                {run.error_code && (
                  <div className="text-xs mt-1 truncate" style={{ color: "var(--red)" }}>
                    {run.error_code}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Flow detail */}
      <div
        className="rounded-lg p-5"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {selectedRun ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RunStatusBadge status={selectedRun.status} />
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {formatDate(selectedRun.started_at)}
                    {selectedRun.ended_at && (
                      <> &rarr; {formatDate(selectedRun.ended_at)}</>
                    )}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Total duration: <strong style={{ color: "var(--text)" }}>{formatDuration(selectedRun.duration_ms)}</strong>
                  {selectedRun.error_code && (
                    <> &middot; Error: <span style={{ color: "var(--red)" }}>{selectedRun.error_code}</span></>
                  )}
                </p>
              </div>
            </div>

            {selectedRun.error_message && (
              <div
                className="rounded p-3 mb-4 text-xs"
                style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "var(--red)" }}
              >
                {selectedRun.error_message}
              </div>
            )}

            <FlowDiagram run={selectedRun} />
          </>
        ) : (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            Select a run to see the flow detail.
          </p>
        )}
      </div>
    </div>
  );
}
