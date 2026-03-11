from fastapi import APIRouter, Depends, Cookie
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.workspace import Workspace

router = APIRouter()


@router.get("/")
def list_workspaces(session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)
    return db.query(Workspace).filter(Workspace.tenant_id == tenant.id).all()
