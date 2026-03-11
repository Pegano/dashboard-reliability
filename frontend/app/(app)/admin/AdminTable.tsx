"use client";

import { useState, useEffect } from "react";

const TABLES = ["customers", "orders", "products"] as const;
type TableName = (typeof TABLES)[number];
type TabType = "data" | "metadata";

interface MetaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export default function AdminTable() {
  const [activeTable, setActiveTable] = useState<TableName>("customers");
  const [activeTab, setActiveTab] = useState<TabType>("data");

  // Data state
  const [dataColumns, setDataColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  // Metadata state
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [metaColumns, setMetaColumns] = useState<MetaColumn[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const url = `/api/admin?table=${activeTable}&type=${activeTab}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (activeTab === "metadata") {
          setRowCount(data.row_count);
          setMetaColumns(data.columns ?? []);
        } else {
          setDataColumns(data.columns ?? []);
          setRows(data.rows ?? []);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeTable, activeTab]);

  return (
    <div>
      {/* Dropdown + tab bar */}
      <div className="flex items-center gap-4 mb-5">
        <select
          value={activeTable}
          onChange={(e) => setActiveTable(e.target.value as TableName)}
          className="text-sm px-3 py-1.5 rounded border"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
          }}
        >
          {TABLES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div className="flex gap-1 border-b flex-1" style={{ borderColor: "var(--border)" }}>
          {(["data", "metadata"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab ? "var(--teal)" : "var(--text-muted)",
                borderBottom: activeTab === tab ? "2px solid var(--teal)" : "2px solid transparent",
              }}
            >
              {tab === "data" ? "Data" : "Metadata"}
            </button>
          ))}
          <span className="ml-auto self-center text-xs pb-1" style={{ color: "var(--text-muted)" }}>
            {loading ? "Laden..." : activeTab === "data" ? `${rows.length} rijen` : rowCount !== null ? `${rowCount} rijen` : ""}
          </span>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border px-5 py-4 mb-4 text-sm"
          style={{ borderColor: "rgba(242,73,92,0.4)", background: "rgba(242,73,92,0.05)", color: "var(--red)" }}
        >
          {error}
        </div>
      )}

      {!error && activeTab === "data" && (
        <div className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                {dataColumns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={dataColumns.length || 1} className="px-4 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                    Geen data
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    {dataColumns.map((col) => (
                      <td key={col} className="px-4 py-3 whitespace-nowrap font-mono text-xs" style={{ color: "var(--text)" }}>
                        {row[col] === null ? <span style={{ color: "var(--text-muted)" }}>NULL</span> : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!error && activeTab === "metadata" && (
        <div className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                {["Kolom", "Type", "Nullable", "Default"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metaColumns.map((col) => (
                <tr key={col.column_name} className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <td className="px-4 py-3 font-mono text-xs font-medium" style={{ color: "var(--text)" }}>{col.column_name}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--teal)" }}>{col.data_type}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: col.is_nullable === "YES" ? "var(--text-muted)" : "var(--text)" }}>
                    {col.is_nullable === "YES" ? "ja" : "nee"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                    {col.column_default ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
