export type HealthStatus = "green" | "yellow" | "red";
export type IncidentSeverity = "warning" | "critical";
export type IncidentStatus = "active" | "resolved";
export type RefreshStatus = "completed" | "failed" | "unknown";

export interface Workspace {
  id: string;
  name: string;
  synced_at: string;
}

export interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  refresh_status: RefreshStatus;
  last_refresh_at: string | null;
  synced_at: string;
}

export interface DatasetHealth {
  dataset_id: string;
  name: string;
  status: HealthStatus;
  active_incidents: number;
  last_refresh_at: string | null;
  refresh_status: RefreshStatus;
}

export interface Incident {
  id: string;
  dataset_id: string;
  detected_at: string;
  resolved_at: string | null;
  status: IncidentStatus;
  severity: IncidentSeverity;
  type: string;
  root_cause_hint: string | null;
  detail: string | null;
}
