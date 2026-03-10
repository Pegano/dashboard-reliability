"use client";

import { useState } from "react";
import AdminTable from "./AdminTable";
import MetricsList from "./MetricsList";

type Tab = "testdata" | "metrics";

export default function AdminTabs() {
  const [active, setActive] = useState<Tab>("testdata");

  return (
    <div>
      <div className="flex gap-1 border-b mb-6" style={{ borderColor: "var(--border)" }}>
        {([
          { id: "testdata", label: "Testdata" },
          { id: "metrics", label: "Metrics" },
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
      {active === "metrics" && <MetricsList />}
    </div>
  );
}
