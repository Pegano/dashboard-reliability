from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.report import Report

router = APIRouter()


@router.get("/")
def list_reports(dataset_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Report)
    if dataset_id:
        query = query.filter(Report.dataset_id == dataset_id)
    return query.all()
