"use client";

interface HeatmapBucket { hour: number; total: number; failed: number; }
interface VolumePoint { day: string; value: number; }
interface VolumeSeries { dataset_id: string; name: string; workspace_id: string; points: VolumePoint[]; }
interface DatasetMapEntry { dataset_id: string; name: string; workspace_id: string; reports: string[]; report_count: number; }

interface Env {
  totals: { datasets: number; reports: number; workspaces: number; runs: number; active_incidents: number; };
  heatmap: HeatmapBucket[];
  volume_series: VolumeSeries[];
  dataset_map: DatasetMapEntry[];
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export default function EnvironmentCharts({ env, workspaceMap }: { env: Env; workspaceMap: Record<string, string> }) {
  const { totals, heatmap, volume_series, dataset_map } = env;

  const maxHeatmap = Math.max(...heatmap.map(h => h.total), 1);

  // Volume series: verzamel alle unieke dagen gesorteerd
  const allDays = Array.from(
    new Set(volume_series.flatMap(s => s.points.map(p => p.day)))
  ).sort();

  // Kleurenpalet voor datasets
  const colors = [
    "var(--teal)", "var(--green)", "var(--yellow)", "var(--red)",
    "#9b59b6", "#e67e22", "#1abc9c", "#e74c3c",
  ];

  return (
    <div className="space-y-6">
      {/* Totalen */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Datasets", value: totals.datasets },
          { label: "Reports", value: totals.reports },
          { label: "Workspaces", value: totals.workspaces },
          { label: "Total runs", value: totals.runs },
          { label: "Active issues", value: totals.active_incidents, highlight: totals.active_incidents > 0 },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className="rounded-lg border px-5 py-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-2xl font-semibold" style={{ color: highlight ? "var(--red)" : "var(--text)" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Refresh heatmap */}
      <div
        className="rounded-lg border px-5 py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          REFRESH ACTIVITY PER HOUR (last 30 days)
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Bar height = number of refreshes · red fill = failures
        </p>
        <div className="flex gap-1 items-end" style={{ height: 64 }}>
          {heatmap.map(({ hour, total, failed }) => {
            const height = total > 0 ? Math.max(4, Math.round((total / maxHeatmap) * 60)) : 2;
            const failedHeight = total > 0 && failed > 0 ? Math.round((failed / total) * height) : 0;
            return (
              <div
                key={hour}
                className="flex-1 flex flex-col justify-end"
                title={`${hour}:00 — ${total} runs${failed > 0 ? `, ${failed} failed` : ""}`}
                style={{ height: 64 }}
              >
                <div style={{ height, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {failedHeight > 0 && (
                    <div style={{ height: failedHeight, background: "var(--red)", opacity: 0.8, borderRadius: "2px 2px 0 0" }} />
                  )}
                  <div style={{
                    height: height - failedHeight,
                    background: total > 0 ? "var(--teal)" : "var(--border)",
                    opacity: total > 0 ? 0.6 : 1,
                    borderRadius: failedHeight > 0 ? 0 : "2px 2px 0 0",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Uuras labels: toon alleen 0, 6, 12, 18, 23 */}
        <div className="flex mt-1" style={{ position: "relative" }}>
          {heatmap.map(({ hour }) => (
            <div key={hour} className="flex-1 text-center">
              {[0, 6, 12, 18, 23].includes(hour) && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{hour}h</span>
              )}
            </div>
          ))}
        </div>
        {/* Drukste uren samenvatting */}
        {(() => {
          const busy = [...heatmap].sort((a, b) => b.total - a.total).slice(0, 3).filter(h => h.total > 0);
          const free = heatmap.filter(h => h.total === 0);
          if (busy.length === 0) return null;
          return (
            <div className="flex gap-6 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>PEAK HOURS</p>
                <p className="text-sm" style={{ color: "var(--text)" }}>
                  {busy.map(h => `${h.hour}:00`).join(", ")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>QUIET HOURS</p>
                <p className="text-sm" style={{ color: "var(--text)" }}>
                  {free.length > 0
                    ? `${free.length} hours with no activity`
                    : "All hours have activity"}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Volume trend — stacked bar chart per workspace */}
      {volume_series.length > 0 && allDays.length > 1 && (() => {
        // Groepeer series per workspace
        const wsIds = Array.from(new Set(volume_series.map(s => s.workspace_id).filter(Boolean)));
        const wsColors: Record<string, string> = {};
        wsIds.forEach((id, i) => { wsColors[id] = colors[i % colors.length]; });

        // Per dag: totaal per workspace
        const stackedData: { day: string; segments: { wsId: string; value: number }[]; total: number }[] = allDays.map(day => {
          const segments = wsIds.map(wsId => {
            const value = volume_series
              .filter(s => s.workspace_id === wsId)
              .reduce((sum, s) => {
                const pt = s.points.find(p => p.day === day);
                return sum + (pt ? pt.value : 0);
              }, 0);
            return { wsId, value };
          });
          return { day, segments, total: segments.reduce((s, seg) => s + seg.value, 0) };
        });

        const maxTotal = Math.max(...stackedData.map(d => d.total), 1);
        const CHART_H = 80;

        return (
          <div
            className="rounded-lg border px-5 py-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              DATASET VOLUME OVER TIME
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Total column cardinality per workspace — proxy for data volume growth
            </p>
            {/* Legenda */}
            <div className="flex flex-wrap gap-4 mb-4">
              {wsIds.map(wsId => (
                <div key={wsId} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: wsColors[wsId] }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {workspaceMap[wsId] ?? wsId}
                  </span>
                </div>
              ))}
            </div>
            {/* Stacked bars */}
            <div className="flex gap-0.5 items-end" style={{ height: CHART_H }}>
              {stackedData.map(({ day, segments, total }) => {
                const totalH = total > 0 ? Math.max(3, Math.round((total / maxTotal) * (CHART_H - 4))) : 2;
                const tooltip = segments.map(seg => `${workspaceMap[seg.wsId] ?? seg.wsId}: ${fmtVolume(seg.value)}`).join(" · ") + ` (total: ${fmtVolume(total)})`;
                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col justify-end"
                    title={`${day.slice(5)} — ${tooltip}`}
                    style={{ height: CHART_H }}
                  >
                    <div style={{ height: totalH, display: "flex", flexDirection: "column", justifyContent: "flex-end", borderRadius: "2px 2px 0 0", overflow: "hidden" }}>
                      {segments.filter(s => s.value > 0).map((seg, si) => {
                        const segH = Math.round((seg.value / total) * totalH);
                        return (
                          <div
                            key={seg.wsId}
                            style={{
                              height: segH,
                              background: wsColors[seg.wsId],
                              opacity: 0.75,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* X-as labels */}
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{allDays[0]?.slice(5)}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                total: {fmtVolume(stackedData[stackedData.length - 1]?.total ?? 0)}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{allDays[allDays.length - 1]?.slice(5)}</span>
            </div>
          </div>
        );
      })()}

      {/* Dataset → rapport mapping */}
      <div
        className="rounded-lg border px-5 py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-xs font-medium mb-4" style={{ color: "var(--text-muted)" }}>
          DATASET → REPORT MAPPING
        </p>
        <div className="space-y-2">
          {dataset_map.map((entry) => (
            <div
              key={entry.dataset_id}
              className="flex items-start gap-4 py-2 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex-1 min-w-0">
                <a
                  href={`/pipelines/${entry.dataset_id}`}
                  className="text-sm font-medium hover:opacity-70 transition-opacity"
                  style={{ color: "var(--text)" }}
                >
                  {entry.name}
                </a>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {workspaceMap[entry.workspace_id] ?? entry.workspace_id}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {entry.reports.length > 0 ? (
                  entry.reports.map((r) => (
                    <span
                      key={r}
                      className="text-xs px-2 py-0.5 rounded border"
                      style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-muted)" }}
                    >
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>No linked reports</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
