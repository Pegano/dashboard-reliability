export type HealthStatus = "green" | "yellow" | "red";
export type IncidentSeverity = "warning" | "critical";
export type IncidentStatus = "active" | "resolved" | "suppressed";
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

export interface Datasource {
  type: string;
  connection: Record<string, string>;
  gatewayId: string | null;
}

export interface DatasetHealth {
  dataset_id: string;
  name: string;
  status: HealthStatus;
  active_incidents: number;
  last_refresh_at: string | null;
  refresh_status: RefreshStatus;
  datasources: Datasource[];
  refresh_schedule_enabled: boolean | null;
  refresh_schedule_times: string[];
  workspace_id: string;
  web_url: string | null;
}

export interface Report {
  id: string;
  name: string;
  dataset_id: string;
  workspace_id: string;
  web_url: string | null;
  synced_at: string;
}

export interface Incident {
  id: string;
  dataset_id: string;
  detected_at: string;
  resolved_at: string | null;
  suppressed_until: string | null;
  status: IncidentStatus;
  severity: IncidentSeverity;
  type: string;
  root_cause_hint: string | null;
  detail: string | null;
  affected_reports: number;
}

export interface RefreshRun {
  id: string;
  dataset_id: string;
  status: "completed" | "failed" | "unknown" | "disabled" | "cancelled";
  refresh_type: string | null;
  started_at: string | null;
  ended_at: string | null;
  error_code: string | null;
  error_description: string | null;
}

export interface RefreshRunWithDataset extends RefreshRun {
  dataset_name: string;
  workspace_name: string;
}

export interface DataflowEntity {
  name: string;
  status: string | null;
  startTime: string | null;
  endTime: string | null;
  error: string | null;
}

export interface Dataflow {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string;
  last_refresh_at: string | null;
  refresh_status: string;
  health: HealthStatus;
  active_incidents: number;
  synced_at: string;
}

export interface DataflowRun {
  id: string;
  dataflow_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  error_code: string | null;
  error_message: string | null;
  entities: DataflowEntity[];
  duration_ms: number | null;
}
