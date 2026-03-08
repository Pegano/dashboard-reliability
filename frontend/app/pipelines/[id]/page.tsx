import { fetchDatasets, fetchIncidents } from "@/lib/api";
import { Dataset, Incident, HealthStatus } from "@/lib/types";
import StatusDot from "@/components/StatusDot";
import SeverityBadge from "@/components/SeverityBadge";
import { notFound } from "next/navigation";
import PipelineTabs from "./PipelineTabs";

function deriveStatus(incidents: Incident[]): HealthStatus {
  const active = incidents.filter((i) => i.status === "active");
  if (active.some((i) => i.severity === "critical")) return "red";
  if (active.some((i) => i.severity === "warning")) return "yellow";
  return "green";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [datasets, allIncidents] = await Promise.all([
    fetchDatasets(),
    fetchIncidents(),
  ]);

  const dataset: Dataset | undefined = datasets.find((d: Dataset) => d.id === id);
  if (!dataset) notFound();

  const incidents: Incident[] = allIncidents.filter((i: Incident) => i.dataset_id === id);
  const activeIncidents = incidents.filter((i) => i.status === "active");
  const status = deriveStatus(incidents);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusDot status={status} showLabel />
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            {dataset.name}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Laatste sync: {formatDate(dataset.synced_at)} &middot; Refresh status: {dataset.refresh_status}
        </p>
      </div>

      {/* Tabs */}
      <PipelineTabs
        dataset={dataset}
        activeIncidents={activeIncidents}
        allIncidents={incidents}
        formatDate={formatDate}
      />
    </div>
  );
}
