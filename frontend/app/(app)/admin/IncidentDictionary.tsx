"use client";

type Entry = {
  type: string;
  label: string;
  severity: "critical" | "warning";
  description: string;
  hint: string;
  example?: string;
};

const INCIDENTS: Entry[] = [
  {
    type: "refresh_failed",
    label: "Refresh failed",
    severity: "critical",
    description: "The last refresh attempt ended with an error.",
    hint: "Check the error code in the Runs tab. Common causes: gateway offline, datasource credentials expired, source schema changed.",
    example: "Column 'OrderDate' not found in datasource — likely removed or renamed.",
  },
  {
    type: "refresh_failed_missing_column",
    label: "Refresh failed — missing column",
    severity: "critical",
    description: "Refresh failed because a column referenced in the Power Query no longer exists in the datasource.",
    hint: "Column {name} not found in datasource — likely removed or renamed.",
    example: "Column 'CustomerID' not found in datasource — likely removed or renamed.",
  },
  {
    type: "refresh_failed_type_mismatch",
    label: "Refresh failed — type mismatch",
    severity: "critical",
    description: "Refresh failed because a column value could not be converted to the expected data type.",
    hint: "Data type mismatch on column {name} — source type may have changed.",
    example: "Data type mismatch on column 'Revenue' — source type may have changed.",
  },
  {
    type: "refresh_failed_missing_table",
    label: "Refresh failed — missing table",
    severity: "critical",
    description: "Refresh failed because a table referenced in the dataset no longer exists in the datasource.",
    hint: "A table referenced by this dataset no longer exists in the datasource.",
  },
  {
    type: "refresh_delayed",
    label: "Refresh delayed",
    severity: "warning",
    description: "No successful refresh has been recorded for more than 24 hours.",
    hint: "Dataset has not been refreshed for {n} hours. Check the refresh schedule.",
    example: "Dataset has not been refreshed for 31 hours. Check the refresh schedule.",
  },
  {
    type: "schema_change",
    label: "Schema change",
    severity: "critical",
    description: "One or more columns were removed or changed type since the last sync.",
    hint: "Column structure changed. Reports using affected columns may break.",
    example: "Removed columns: Sales.Orders.OrderDate | Type changes: Sales.Orders.Amount (Int64 → String)",
  },
  {
    type: "refresh_slow",
    label: "Slow refresh",
    severity: "warning",
    description: "The last refresh took significantly longer than the historical average (2× or more).",
    hint: "Last run duration compared to the average of the previous 10 successful runs.",
    example: "Last run: 14m 2s — avg last 10 runs: 3m 12s (4.4x slower)",
  },
  {
    type: "dataset_growth",
    label: "Dataset growth",
    severity: "warning",
    description: "The estimated row count is significantly higher than the historical average (2× or more).",
    hint: "Unexpected data volume increase. Could indicate a missing filter or data duplication in the source.",
    example: "Current volume: 2.4M — avg last 4 syncs: 820K (2.9x larger)",
  },
];

const severityStyle: Record<Entry["severity"], { bg: string; color: string; label: string }> = {
  critical: { bg: "rgba(242,73,92,0.12)", color: "var(--red)", label: "Critical" },
  warning: { bg: "rgba(250,176,5,0.12)", color: "var(--yellow)", label: "Warning" },
};

export default function IncidentDictionary() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {INCIDENTS.map((entry) => {
        const sev = severityStyle[entry.severity];
        return (
          <div
            key={entry.type}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "14px 16px",
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: "4px 24px",
            }}
          >
            {/* Left */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                {entry.label}
              </span>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: sev.bg,
                  color: sev.color,
                  width: "fit-content",
                }}
              >
                {sev.label}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                {entry.type}
              </span>
            </div>

            {/* Right */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text)" }}>
                {entry.description}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>Hint: </span>
                {entry.hint}
              </p>
              {entry.example && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "monospace",
                    background: "var(--bg)",
                    padding: "4px 8px",
                    borderRadius: 4,
                    borderLeft: "2px solid var(--border)",
                  }}
                >
                  {entry.example}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
