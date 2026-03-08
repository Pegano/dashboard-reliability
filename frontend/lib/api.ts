const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchWorkspaces() {
  const res = await fetch(`${API_BASE}/api/workspaces/`);
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

export async function fetchDatasets(workspaceId?: string) {
  const url = workspaceId
    ? `${API_BASE}/api/datasets/?workspace_id=${workspaceId}`
    : `${API_BASE}/api/datasets/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch datasets");
  return res.json();
}

export async function fetchDatasetHealth(datasetId: string) {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/health`);
  if (!res.ok) throw new Error("Failed to fetch dataset health");
  return res.json();
}

export async function fetchIncidents(status?: string) {
  const url = status
    ? `${API_BASE}/api/incidents/?status=${status}`
    : `${API_BASE}/api/incidents/`;
  const res = await fetch(url);
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
