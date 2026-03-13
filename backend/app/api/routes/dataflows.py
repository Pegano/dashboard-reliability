from fastapi import APIRouter, Cookie, HTTPException
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.deps import get_current_tenant
from app.models.dataflow import Dataflow, DataflowRun, DataflowStatus
from app.models.incident import Incident, IncidentStatus

router = APIRouter()


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from fastapi import Depends


@router.get("/")
def list_dataflows(
    workspace_id: str | None = None,
    session: str | None = Cookie(default=None),
    db: Session = Depends(_get_db),
):
    tenant = get_current_tenant(db, session)
    query = db.query(Dataflow).filter(Dataflow.tenant_id == tenant.id)
    if workspace_id:
        query = query.filter(Dataflow.workspace_id == workspace_id)
    dataflows = query.all()

    result = []
    for df in dataflows:
        active_incidents = db.query(Incident).filter(
            Incident.dataflow_id == df.id,
            Incident.status == IncidentStatus.active,
        ).all()

        if not active_incidents:
            status = "green"
        elif any(i.severity.value == "critical" for i in active_incidents):
            status = "red"
        else:
            status = "yellow"

        result.append({
            "id": df.id,
            "name": df.name,
            "description": df.description,
            "workspace_id": df.workspace_id,
            "last_refresh_at": df.last_refresh_at,
            "refresh_status": df.refresh_status.value if df.refresh_status else "unknown",
            "health": status,
            "active_incidents": len(active_incidents),
            "synced_at": df.synced_at,
        })

    return result


@router.get("/{dataflow_id}")
def get_dataflow(
    dataflow_id: str,
    session: str | None = Cookie(default=None),
    db: Session = Depends(_get_db),
):
    tenant = get_current_tenant(db, session)
    df = db.query(Dataflow).filter(
        Dataflow.id == dataflow_id,
        Dataflow.tenant_id == tenant.id,
    ).first()
    if not df:
        raise HTTPException(status_code=404, detail="Dataflow not found")

    active_incidents = db.query(Incident).filter(
        Incident.dataflow_id == dataflow_id,
        Incident.status == IncidentStatus.active,
    ).all()

    if not active_incidents:
        health = "green"
    elif any(i.severity.value == "critical" for i in active_incidents):
        health = "red"
    else:
        health = "yellow"

    return {
        "id": df.id,
        "name": df.name,
        "description": df.description,
        "workspace_id": df.workspace_id,
        "last_refresh_at": df.last_refresh_at,
        "refresh_status": df.refresh_status.value if df.refresh_status else "unknown",
        "health": health,
        "active_incidents": len(active_incidents),
        "synced_at": df.synced_at,
    }


@router.get("/{dataflow_id}/schema")
def get_dataflow_schema(
    dataflow_id: str,
    session: str | None = Cookie(default=None),
    db: Session = Depends(_get_db),
):
    """Schema van alle datasets die upstream van deze dataflow liggen, gegroepeerd per entiteitnaam."""
    from app.models.dataset import Dataset
    from app.models.schema import DatasetColumn

    tenant = get_current_tenant(db, session)
    df = db.query(Dataflow).filter(
        Dataflow.id == dataflow_id,
        Dataflow.tenant_id == tenant.id,
    ).first()
    if not df:
        raise HTTPException(status_code=404, detail="Dataflow not found")

    # Datasets die deze dataflow als upstream hebben
    from sqlalchemy import cast
    from sqlalchemy.dialects.postgresql import JSONB

    datasets = db.query(Dataset).filter(
        Dataset.tenant_id == tenant.id,
        Dataset.upstream_dataflow_ids.cast(JSONB).contains(cast([dataflow_id], JSONB)),
    ).all()

    # Kolommen per tabel, over alle gekoppelde datasets
    entity_schema: dict[str, list[dict]] = {}
    for dataset in datasets:
        columns = db.query(DatasetColumn).filter(
            DatasetColumn.dataset_id == dataset.id,
            DatasetColumn.is_active == True,
        ).order_by(DatasetColumn.table_name, DatasetColumn.column_name).all()
        for col in columns:
            if col.table_name not in entity_schema:
                entity_schema[col.table_name] = []
            entity_schema[col.table_name].append({
                "column_name": col.column_name,
                "data_type": col.data_type,
                "cardinality": col.cardinality,
            })

    return {
        "dataflow_id": dataflow_id,
        "datasets": [{"id": d.id, "name": d.name} for d in datasets],
        "entities": [
            {"entity_name": name, "columns": cols}
            for name, cols in sorted(entity_schema.items())
        ],
    }


@router.get("/{dataflow_id}/runs")
def list_dataflow_runs(
    dataflow_id: str,
    limit: int = 50,
    session: str | None = Cookie(default=None),
    db: Session = Depends(_get_db),
):
    tenant = get_current_tenant(db, session)
    df = db.query(Dataflow).filter(
        Dataflow.id == dataflow_id,
        Dataflow.tenant_id == tenant.id,
    ).first()
    if not df:
        raise HTTPException(status_code=404, detail="Dataflow not found")

    runs = db.query(DataflowRun).filter(
        DataflowRun.dataflow_id == dataflow_id,
    ).order_by(DataflowRun.started_at.desc()).limit(limit).all()

    return [
        {
            "id": r.id,
            "dataflow_id": r.dataflow_id,
            "status": r.status.value if r.status else "unknown",
            "started_at": r.started_at,
            "ended_at": r.ended_at,
            "error_code": r.error_code,
            "error_message": r.error_message,
            "entities": r.entities or [],
            "duration_ms": (
                int((r.ended_at - r.started_at).total_seconds() * 1000)
                if r.started_at and r.ended_at else None
            ),
        }
        for r in runs
    ]
