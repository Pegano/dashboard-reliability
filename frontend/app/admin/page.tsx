import AdminTabs from "./AdminTabs";


async function fetchAdminData() {
  try {
    const res = await fetch("http://localhost:8000/api/admin/last-run", { cache: "no-store" });
    if (!res.ok) return { last_synced_at: null, model_refreshes: [] };
    return await res.json();
  } catch {
    return { last_synced_at: null, model_refreshes: [] };
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminPage() {
  const { last_synced_at, model_refreshes } = await fetchAdminData();

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

      {/* Last Pulse sync */}
      <div
        className="rounded-lg border px-5 py-3 mb-6 flex items-center gap-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>LAST PULSE SYNC</p>
          <p className="text-sm font-mono" style={{ color: "var(--text)" }}>
            {formatDate(last_synced_at)}
          </p>
        </div>
      </div>

      <AdminTabs modelRefreshes={model_refreshes} />
    </div>
  );
}
