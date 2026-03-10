const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const NO_CACHE = { cache: "no-store" } as const;

export async function fetchWorkspaces() {
  const res = await fetch(`${API_BASE}/api/workspaces/`, NO_CACHE);
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

export async function fetchDatasets(workspaceId?: string) {
  const url = workspaceId
    ? `${API_BASE}/api/datasets/?workspace_id=${workspaceId}`
    : `${API_BASE}/api/datasets/`;
  const res = await fetch(url, NO_CACHE);
  if (!res.ok) throw new Error("Failed to fetch datasets");
  return res.json();
}

export async function fetchDatasetHealth(datasetId: string) {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/health`, NO_CACHE);
  if (!res.ok) throw new Error("Failed to fetch dataset health");
  return res.json();
}

export async function fetchIncidents(status?: string) {
  const url = status
    ? `${API_BASE}/api/incidents/?status=${status}`
    : `${API_BASE}/api/incidents/`;
  const res = await fetch(url, NO_CACHE);
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

export async function resolveIncident(incidentId: string) {
  const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/resolve`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to resolve incident");
  return res.json();
}

export async function suppressIncident(incidentId: string, hours = 24) {
  // Uses Next.js API route as proxy — keeps backend unreachable from browser
  const res = await fetch(`/api/incidents/${incidentId}/suppress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hours }),
  });
  if (!res.ok) throw new Error("Failed to suppress incident");
  return res.json();
}

export async function fetchReports(datasetId?: string) {
  const url = datasetId
    ? `${API_BASE}/api/reports/?dataset_id=${datasetId}`
    : `${API_BASE}/api/reports/`;
  const res = await fetch(url, NO_CACHE);
  if (!res.ok) throw new Error("Failed to fetch reports");
  return res.json();
}

export async function fetchRuns(datasetId: string) {
  const res = await fetch(`${API_BASE}/api/runs/?dataset_id=${datasetId}`, NO_CACHE);
  if (!res.ok) throw new Error("Failed to fetch runs");
  return res.json();
}

export async function fetchEnvironment() {
  const res = await fetch(`${API_BASE}/api/environment/`, NO_CACHE);
  if (!res.ok) throw new Error("Failed to fetch environment");
  return res.json();
}

export async function fetchSyncStatus() {
  const res = await fetch(`${API_BASE}/api/environment/sync-status`, NO_CACHE);
  if (!res.ok) return { last_synced_at: null };
  return res.json();
}
