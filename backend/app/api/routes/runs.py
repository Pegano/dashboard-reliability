from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.refresh_run import RefreshRun

router = APIRouter()

@router.get("/")
def list_runs(dataset_id: str | None = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(RefreshRun)
    if dataset_id:
        query = query.filter(RefreshRun.dataset_id == dataset_id)
    return query.order_by(RefreshRun.ended_at.desc().nullslast()).limit(limit).all()
