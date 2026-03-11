from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.refresh_run import RefreshRun
from app.models.dataset import Dataset
from app.models.workspace import Workspace

router = APIRouter()

@router.get("/")
def list_runs(
    dataset_id: str | None = None,
    status: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    query = db.query(RefreshRun)
    if dataset_id:
        query = query.filter(RefreshRun.dataset_id == dataset_id)
    if status:
        query = query.filter(RefreshRun.status == status)
    runs = query.order_by(RefreshRun.ended_at.desc().nullslast()).limit(limit).all()

    dataset_map = {d.id: (d.name, d.workspace_id) for d in db.query(Dataset).all()}
    workspace_map = {w.id: w.name for w in db.query(Workspace).all()}
    result = []
    for r in runs:
        ds_name, ws_id = dataset_map.get(r.dataset_id, ("Unknown", None))
        result.append({
            "id": r.id,
            "dataset_id": r.dataset_id,
            "dataset_name": ds_name,
            "workspace_name": workspace_map.get(ws_id, "") if ws_id else "",
            "status": r.status,
            "refresh_type": r.refresh_type,
            "started_at": r.started_at,
            "ended_at": r.ended_at,
            "error_code": r.error_code,
            "error_description": r.error_description,
        })
    return result
