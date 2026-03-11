"use client";

type MetricStatus = "available" | "partial" | "planned";

interface Metric {
  name: string;
  description: string;
  source: string;
  status: MetricStatus;
  category: string;
  shown: string | null; // page/component where shown, or null if not shown
}

const METRICS: Metric[] = [
  // Refresh gezondheid
  {
    name: "Refresh success rate",
    description: "% succesvol afgeronde refreshes over alle runs",
    source: "refresh_runs.status",
    status: "available",
    category: "Refresh",
    shown: "Model detail → Analysis",
  },
  {
    name: "Gemiddelde refresh duur",
    description: "Gemiddelde duur in ms per dataset over de laatste N runs",
    source: "refresh_runs.started_at / ended_at",
    status: "available",
    category: "Refresh",
    shown: "Model detail → Analysis",
  },
  {
    name: "Langste refresh duur (max)",
    description: "De langste ooit gemeten refresh per dataset",
    source: "refresh_runs.started_at / ended_at",
    status: "available",
    category: "Refresh",
    shown: "Model detail → Analysis",
  },
  {
    name: "Refresh duur trend",
    description: "Verloop van gemiddelde duur over tijd — wordt de refresh langzamer?",
    source: "dataset_snapshots.duration_ms",
    status: "available",
    category: "Refresh",
    shown: "Model detail → Analysis",
  },
  {
    name: "Aantal mislukte refreshes (totaal)",
    description: "Totaal aantal gefaalde runs per dataset of over de hele omgeving",
    source: "refresh_runs.status = failed",
    status: "available",
    category: "Refresh",
    shown: "Model detail → Analysis",
  },
  {
    name: "Meest voorkomende error codes",
    description: "Ranglijst van error codes over alle gefaalde runs",
    source: "refresh_runs.error_code",
    status: "available",
    category: "Refresh",
    shown: null,
  },
  {
    name: "Tijd sinds laatste succesvolle refresh",
    description: "Hoe lang geleden is het model voor het laatst succesvol bijgewerkt?",
    source: "datasets.last_refresh_at",
    status: "available",
    category: "Refresh",
    shown: "Modellen overzicht + Model detail",
  },
  {
    name: "Datasets zonder geplande refresh",
    description: "Modellen waarbij refresh_schedule_enabled = false",
    source: "datasets.refresh_schedule_enabled",
    status: "available",
    category: "Refresh",
    shown: null,
  },
  {
    name: "Refresh frequentie",
    description: "Hoe vaak per dag/week wordt een dataset ververst (op basis van schedule_times)",
    source: "datasets.refresh_schedule_times",
    status: "available",
    category: "Refresh",
    shown: null,
  },

  // Volume & schema
  {
    name: "Geschat aantal rijen per dataset",
    description: "Som van cardinalities als proxy voor datavolume",
    source: "dataset_snapshots.row_count_estimate",
    status: "available",
    category: "Volume & Schema",
    shown: "Omgeving → Volume over tijd",
  },
  {
    name: "Volume groei over tijd",
    description: "Verloop van row_count_estimate per dataset over meerdere snapshots",
    source: "dataset_snapshots.row_count_estimate + synced_at",
    status: "available",
    category: "Volume & Schema",
    shown: "Omgeving → Volume over tijd",
  },
  {
    name: "Aantal tabellen per dataset",
    description: "Unieke table_name waarden per dataset",
    source: "dataset_columns.table_name",
    status: "available",
    category: "Volume & Schema",
    shown: null,
  },
  {
    name: "Aantal kolommen per dataset",
    description: "Totaal aantal actieve kolommen per dataset",
    source: "dataset_columns.is_active = true",
    status: "available",
    category: "Volume & Schema",
    shown: null,
  },
  {
    name: "Kolom cardinality per kolom",
    description: "Aantal unieke waarden per kolom — indicator voor data diversiteit",
    source: "dataset_columns.cardinality",
    status: "available",
    category: "Volume & Schema",
    shown: null,
  },
  {
    name: "Verdwenen kolommen (actief)",
    description: "Kolommen die bij de laatste sync niet meer aanwezig waren",
    source: "dataset_columns.is_active = false",
    status: "available",
    category: "Volume & Schema",
    shown: "Model detail → Fix (schema_change incident)",
  },
  {
    name: "Gemiddelde kolom leeftijd",
    description: "Hoe lang bestaat een kolom al (first_seen_at → now)",
    source: "dataset_columns.first_seen_at",
    status: "available",
    category: "Volume & Schema",
    shown: null,
  },

  // Incidents
  {
    name: "Actieve incidents per type",
    description: "Aantal actieve incidents per type (refresh_failed, schema_change, etc.)",
    source: "incidents.type + status",
    status: "available",
    category: "Incidents",
    shown: null,
  },
  {
    name: "Mean Time To Detect (MTTD)",
    description: "Tijd tussen laatste refresh en incident aanmaak",
    source: "incidents.detected_at - datasets.last_refresh_at",
    status: "available",
    category: "Incidents",
    shown: null,
  },
  {
    name: "Mean Time To Resolve (MTTR)",
    description: "Tijd tussen incident detectie en auto-resolve",
    source: "incidents.detected_at / resolved_at",
    status: "available",
    category: "Incidents",
    shown: null,
  },
  {
    name: "Incidents per dataset (historisch)",
    description: "Totaal aantal incidents ooit per dataset — welke modellen zijn het meest instabiel?",
    source: "incidents.dataset_id",
    status: "available",
    category: "Incidents",
    shown: "Issues overzicht",
  },
  {
    name: "Suppression rate",
    description: "% incidents dat door gebruiker is gesuppressed in plaats van auto-resolved",
    source: "incidents.status = suppressed",
    status: "available",
    category: "Incidents",
    shown: null,
  },
  {
    name: "Recidive rate",
    description: "Datasets met meer dan N incidents van hetzelfde type — structureel probleem",
    source: "incidents.type + dataset_id",
    status: "available",
    category: "Incidents",
    shown: null,
  },

  // Omgeving
  {
    name: "Aantal workspaces",
    description: "Totaal gemonitorde workspaces",
    source: "workspaces",
    status: "available",
    category: "Omgeving",
    shown: "Omgeving",
  },
  {
    name: "Aantal datasets",
    description: "Totaal gemonitorde datasets",
    source: "datasets",
    status: "available",
    category: "Omgeving",
    shown: "Omgeving + Modellen overzicht",
  },
  {
    name: "Aantal rapporten",
    description: "Totaal bekende rapporten gekoppeld aan datasets",
    source: "reports",
    status: "available",
    category: "Omgeving",
    shown: "Omgeving + Model detail → Issues",
  },
  {
    name: "Datasets met gateway",
    description: "Modellen die via een on-premise gateway verbinden",
    source: "datasets.datasources[].gatewayId",
    status: "available",
    category: "Omgeving",
    shown: "Model detail → Fix",
  },
  {
    name: "Datasource type verdeling",
    description: "Welke brontypes worden gebruikt: SQL, File, Web, SharePoint, etc.",
    source: "datasets.datasources[].type",
    status: "available",
    category: "Omgeving",
    shown: "Model detail → Fix",
  },
  {
    name: "Datasets per workspace",
    description: "Verdeling van datasets over workspaces",
    source: "datasets.workspace_id",
    status: "available",
    category: "Omgeving",
    shown: "Modellen overzicht (workspace filter)",
  },
  {
    name: "Rapporten zonder dataset",
    description: "Rapporten waarvan de onderliggende dataset niet meer bestaat of niet gekoppeld is",
    source: "reports.dataset_id = NULL",
    status: "available",
    category: "Omgeving",
    shown: null,
  },

  // Alerts
  {
    name: "Aantal verzonden alerts",
    description: "Totaal alerts verstuurd per kanaal (email / telegram)",
    source: "alerts.channel + sent_at",
    status: "available",
    category: "Alerts",
    shown: null,
  },
  {
    name: "Alert frequentie per dataset",
    description: "Welke datasets veroorzaken de meeste alerts?",
    source: "alerts → incidents → dataset_id",
    status: "available",
    category: "Alerts",
    shown: null,
  },

  // Toekomstig / gedeeltelijk
  {
    name: "Refresh overlap detectie",
    description: "Detecteer of twee refreshes tegelijk draaien op dezelfde dataset",
    source: "refresh_runs.started_at / ended_at overlap",
    status: "planned",
    category: "Refresh",
    shown: null,
  },
  {
    name: "Piek-uur analyse",
    description: "Op welke tijdstippen falen de meeste refreshes?",
    source: "refresh_runs.started_at (hour)",
    status: "planned",
    category: "Refresh",
    shown: null,
  },
  {
    name: "Schema stabiliteit score",
    description: "Score 0-100 op basis van hoe vaak kolommen verdwijnen per dataset",
    source: "dataset_columns.is_active history",
    status: "planned",
    category: "Volume & Schema",
    shown: null,
  },
  {
    name: "Data versheid score",
    description: "Gecombineerde score: hoe actueel is de data t.o.v. het schedule?",
    source: "datasets.last_refresh_at + refresh_schedule_times",
    status: "planned",
    category: "Omgeving",
    shown: null,
  },
];

const STATUS_LABEL: Record<MetricStatus, string> = {
  available: "Beschikbaar",
  partial: "Gedeeltelijk",
  planned: "Gepland",
};

const STATUS_COLOR: Record<MetricStatus, string> = {
  available: "rgba(115,191,105,0.15)",
  partial: "rgba(250,222,42,0.15)",
  planned: "rgba(110,113,128,0.15)",
};

const STATUS_TEXT: Record<MetricStatus, string> = {
  available: "var(--green)",
  partial: "var(--yellow)",
  planned: "var(--text-muted)",
};

const CATEGORIES = Array.from(new Set(METRICS.map((m) => m.category)));

export default function MetricsList() {
  return (
    <div className="space-y-8" style={{ maxWidth: "calc(100vw - 290px)" }}>
      <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        {(["available", "partial", "planned"] as MetricStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: STATUS_COLOR[s], color: STATUS_TEXT[s] }}>
              {STATUS_LABEL[s]}
            </span>
            <span>{METRICS.filter((m) => m.status === s).length}x</span>
          </div>
        ))}
        <span className="ml-auto">{METRICS.length} metrics totaal</span>
      </div>

      {CATEGORIES.map((cat) => {
        const items = METRICS.filter((m) => m.category === cat);
        return (
          <div key={cat}>
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              {cat}
            </p>
            <div className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
              <table className="text-sm w-full" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "220px" }} />
                  <col style={{ width: "340px" }} />
                  <col style={{ width: "260px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "240px" }} />
                </colgroup>
                <thead>
                  <tr className="border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>Metric</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>Omschrijving</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>Databron</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>Zichtbaar in tool</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.name} className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      <td className="px-4 py-2 font-mono text-xs overflow-hidden" style={{ color: "var(--text-muted)" }}>{m.name}</td>
                      <td className="px-4 py-2 font-mono text-xs overflow-hidden" style={{ color: "var(--text-muted)" }}>{m.description}</td>
                      <td className="px-4 py-2 font-mono text-xs overflow-hidden" style={{ color: "var(--text-muted)" }}>{m.source}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{ background: STATUS_COLOR[m.status], color: STATUS_TEXT[m.status] }}>
                          {STATUS_LABEL[m.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs overflow-hidden" style={{ color: "var(--text-muted)", opacity: m.shown ? 1 : 0.4 }}>
                        {m.shown ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
