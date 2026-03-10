import AdminTabs from "./AdminTabs";

async function fetchLastRun() {
  try {
    const res = await fetch("http://localhost:8000/api/admin/last-run", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.last_run ?? null;
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  const lastRun = await fetchLastRun();

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
          Admin
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Testdata · metrics overzicht
        </p>
      </div>

      {/* Last run context */}
      <div
        className="rounded-lg border px-5 py-3 mb-6 flex items-center gap-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>LAST REFRESH — ORDEROVERZICHT</p>
          <p className="text-sm font-mono" style={{ color: "var(--text)" }}>
            {lastRun
              ? new Date(lastRun.ended_at).toLocaleString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>STATUS</p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              background: lastRun?.status === "completed"
                ? "rgba(115,191,105,0.15)"
                : lastRun?.status === "failed"
                ? "rgba(242,73,92,0.15)"
                : "rgba(110,113,128,0.15)",
              color: lastRun?.status === "completed"
                ? "var(--green)"
                : lastRun?.status === "failed"
                ? "var(--red)"
                : "var(--text-muted)",
            }}
          >
            {lastRun?.status ?? "—"}
          </span>
        </div>
        {lastRun?.error_code && (
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>ERROR CODE</p>
            <p className="text-xs font-mono" style={{ color: "var(--red)" }}>{lastRun.error_code}</p>
          </div>
        )}
      </div>

      <AdminTabs />
    </div>
  );
}
