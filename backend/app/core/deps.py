from fastapi import Cookie, HTTPException
from sqlalchemy.orm import Session
from app.core.jwt import decode_session_token
from app.models.auth import TenantUser, Tenant


def get_current_tenant(
    db: Session,
    session: str | None,
) -> Tenant:
    """Haal de tenant op voor de ingelogde gebruiker. Raises 401/404 als niet gevonden."""
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_session_token(session)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid session")

    user_id = payload["sub"]
    tenant_user = db.query(TenantUser).filter(TenantUser.user_id == user_id).first()
    if not tenant_user:
        raise HTTPException(status_code=404, detail="No tenant found for user")

    return tenant_user.tenant
