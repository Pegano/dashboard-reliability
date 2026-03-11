from fastapi import APIRouter, Depends, Cookie
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.report import Report
from app.models.dataset import Dataset

router = APIRouter()


@router.get("/")
def list_reports(dataset_id: str | None = None, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)
    query = db.query(Report).join(Dataset, Report.dataset_id == Dataset.id).filter(
        Dataset.tenant_id == tenant.id
    )
    if dataset_id:
        query = query.filter(Report.dataset_id == dataset_id)
    return query.all()
