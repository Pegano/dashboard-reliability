from fastapi import APIRouter, HTTPException, Cookie, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.core.jwt import decode_session_token
from app.models.auth import TenantUser, User

router = APIRouter()


@router.get("/")
def list_members(session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)
    members = db.query(TenantUser).filter(TenantUser.tenant_id == tenant.id).all()
    return [
        {
            "user_id": m.user_id,
            "email": m.user.email,
            "role": m.role.value,
            "joined_at": m.created_at.isoformat(),
        }
        for m in members
    ]


@router.delete("/{user_id}")
def remove_member(user_id: str, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)

    # Prevent removing yourself
    from app.core.jwt import decode_session_token
    payload = decode_session_token(session)
    if payload and payload["sub"] == user_id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself.")

    member = db.query(TenantUser).filter(
        TenantUser.tenant_id == tenant.id,
        TenantUser.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")
    db.delete(member)
    db.commit()
    return {"ok": True}
