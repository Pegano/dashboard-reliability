from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.workspace import Workspace

router = APIRouter()


@router.get("/")
def list_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).all()
