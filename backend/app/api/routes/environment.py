from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.dataset import Dataset
from app.models.report import Report
from app.models.workspace import Workspace
from app.models.refresh_run import RefreshRun, RunStatus
from app.models.incident import Incident, IncidentStatus
from app.models.schema import DatasetSnapshot

router = APIRouter()


@router.get("/sync-status")
def get_sync_status(db: Session = Depends(get_db)):
    latest = db.query(func.max(Dataset.synced_at)).scalar()
    # Voeg Z toe zodat de browser het correct als UTC parseert
    ts = latest.strftime("%Y-%m-%dT%H:%M:%SZ") if latest else None
    return {"last_synced_at": ts}


@router.get("/")
def get_environment(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).all()
    dataset_ids = [d.id for d in datasets]

    total_datasets = len(datasets)
    total_reports = db.query(Report).count()
    total_workspaces = db.query(Workspace).count()
    total_runs = db.query(RefreshRun).filter(RefreshRun.dataset_id.in_(dataset_ids)).count()
    active_incidents = db.query(Incident).filter(
        Incident.dataset_id.in_(dataset_ids),
        Incident.status == IncidentStatus.active,
    ).count()

    # Refresh heatmap — runs per uur van de dag (0–23), laatste 30 dagen
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=30)

    runs_recent = db.query(RefreshRun).filter(
        RefreshRun.dataset_id.in_(dataset_ids),
        RefreshRun.started_at.isnot(None),
        RefreshRun.started_at >= cutoff,
    ).all()

    # Heatmap: uur -> {total, failed}
    heatmap = {h: {"total": 0, "failed": 0} for h in range(24)}
    for run in runs_recent:
        hour = run.started_at.hour
        heatmap[hour]["total"] += 1
        if run.status == RunStatus.failed:
            heatmap[hour]["failed"] += 1

    heatmap_list = [
        {"hour": h, "total": heatmap[h]["total"], "failed": heatmap[h]["failed"]}
        for h in range(24)
    ]

    # Volume trend — laatste 14 snapshots per dataset (meest recente per dag)
    snapshots = db.query(DatasetSnapshot).filter(
        DatasetSnapshot.dataset_id.in_(dataset_ids),
        DatasetSnapshot.row_count_estimate.isnot(None),
    ).order_by(DatasetSnapshot.synced_at.asc()).all()

    # Groepeer per dataset, neem per dag het laatste snapshot
    from collections import defaultdict
    dataset_volume: dict[str, dict[str, int]] = defaultdict(dict)
    for snap in snapshots:
        day = snap.synced_at.strftime("%Y-%m-%d")
        dataset_volume[snap.dataset_id][day] = snap.row_count_estimate

    # Dataset naam + workspace map
    name_map = {d.id: d.name for d in datasets}
    workspace_map_ds = {d.id: d.workspace_id for d in datasets}

    volume_series = [
        {
            "dataset_id": ds_id,
            "name": name_map.get(ds_id, ds_id),
            "workspace_id": workspace_map_ds.get(ds_id),
            "points": [
                {"day": day, "value": val}
                for day, val in sorted(days.items())
            ],
        }
        for ds_id, days in dataset_volume.items()
    ]

    # Dataset → rapporten mapping
    reports = db.query(Report).all()
    dataset_reports: dict[str, list[str]] = defaultdict(list)
    for r in reports:
        if r.dataset_id:
            dataset_reports[r.dataset_id].append(r.name)

    dataset_map = [
        {
            "dataset_id": d.id,
            "name": d.name,
            "workspace_id": d.workspace_id,
            "reports": dataset_reports.get(d.id, []),
            "report_count": len(dataset_reports.get(d.id, [])),
        }
        for d in datasets
    ]

    return {
        "totals": {
            "datasets": total_datasets,
            "reports": total_reports,
            "workspaces": total_workspaces,
            "runs": total_runs,
            "active_incidents": active_incidents,
        },
        "heatmap": heatmap_list,
        "volume_series": volume_series,
        "dataset_map": dataset_map,
    }
