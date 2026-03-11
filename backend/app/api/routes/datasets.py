from fastapi import APIRouter, Depends, HTTPException, Cookie
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.dataset import Dataset
from app.models.incident import Incident, IncidentStatus

router = APIRouter()


@router.get("/")
def list_datasets(workspace_id: str | None = None, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)
    query = db.query(Dataset).filter(Dataset.tenant_id == tenant.id)
    if workspace_id:
        query = query.filter(Dataset.workspace_id == workspace_id)
    return query.all()


@router.get("/{dataset_id}")
def get_dataset(dataset_id: str, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.tenant_id == tenant.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset niet gevonden")
    return dataset


@router.get("/{dataset_id}/health")
def get_dataset_health(dataset_id: str, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.tenant_id == tenant.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset niet gevonden")

    active_incidents = db.query(Incident).filter(
        Incident.dataset_id == dataset_id,
        Incident.status == IncidentStatus.active,
    ).all()

    if not active_incidents:
        status = "green"
    elif any(i.severity.value == "critical" for i in active_incidents):
        status = "red"
    else:
        status = "yellow"

    return {
        "dataset_id": dataset_id,
        "name": dataset.name,
        "status": status,
        "active_incidents": len(active_incidents),
        "last_refresh_at": dataset.last_refresh_at,
        "refresh_status": dataset.refresh_status,
        "datasources": dataset.datasources or [],
        "refresh_schedule_enabled": dataset.refresh_schedule_enabled,
        "refresh_schedule_times": dataset.refresh_schedule_times or [],
        "workspace_id": dataset.workspace_id,
        "web_url": dataset.web_url,
    }
