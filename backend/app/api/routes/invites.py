import uuid
import datetime
import logging
import resend
from fastapi import APIRouter, HTTPException, Cookie, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.deps import get_current_tenant
from app.models.auth import User, TenantUser, TenantInvite, UserRole

logger = logging.getLogger(__name__)
router = APIRouter()

INVITE_EXPIRY_DAYS = 7


class InviteRequest(BaseModel):
    email: EmailStr


@router.post("/")
def create_invite(body: InviteRequest, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)

    # Check if user is already a member
    existing_user = db.query(User).filter(User.email == body.email).first()
    if existing_user:
        already_member = db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant.id,
            TenantUser.user_id == existing_user.id,
        ).first()
        if already_member:
            raise HTTPException(status_code=400, detail="This email is already a member of your organisation.")

    # Invalidate previous pending invite for same email+tenant
    db.query(TenantInvite).filter(
        TenantInvite.tenant_id == tenant.id,
        TenantInvite.email == body.email,
        TenantInvite.accepted_at.is_(None),
    ).delete()

    token = str(uuid.uuid4())
    invite = TenantInvite(
        tenant_id=tenant.id,
        email=body.email,
        token=token,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=INVITE_EXPIRY_DAYS),
    )
    db.add(invite)
    db.commit()

    invite_url = f"{settings.app_url}/invite?token={token}"
    _send_invite_email(body.email, tenant.name, invite_url)

    return {"ok": True}


@router.post("/accept")
def accept_invite(token: str, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    invite = db.query(TenantInvite).filter(TenantInvite.token == token).first()
    if not invite or not invite.is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link.")

    # Require the user to be logged in
    from app.core.jwt import decode_session_token
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_session_token(session)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = payload["sub"]

    # Check email matches
    user = db.get(User, user_id)
    if not user or user.email.lower() != invite.email.lower():
        raise HTTPException(status_code=403, detail="This invite was sent to a different email address.")

    # Already a member?
    existing = db.query(TenantUser).filter(
        TenantUser.tenant_id == invite.tenant_id,
        TenantUser.user_id == user_id,
    ).first()
    if not existing:
        tenant_user = TenantUser(
            tenant_id=invite.tenant_id,
            user_id=user_id,
            role=invite.role,
        )
        db.add(tenant_user)

    invite.accepted_at = datetime.datetime.utcnow()
    db.commit()

    return {"ok": True, "tenant_id": invite.tenant_id}


@router.get("/info")
def get_invite_info(token: str, db: Session = Depends(get_db)):
    """Public endpoint — returns invite details so the accept page can show org name."""
    invite = db.query(TenantInvite).filter(TenantInvite.token == token).first()
    if not invite or not invite.is_valid:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link.")
    from app.models.auth import Tenant
    tenant = db.get(Tenant, invite.tenant_id)
    return {"email": invite.email, "org_name": tenant.name if tenant else ""}



@router.get("/")
def list_invites(session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    """List pending invites for the current tenant."""
    tenant = get_current_tenant(db, session)
    invites = db.query(TenantInvite).filter(
        TenantInvite.tenant_id == tenant.id,
        TenantInvite.accepted_at.is_(None),
        TenantInvite.expires_at > datetime.datetime.utcnow(),
    ).order_by(TenantInvite.created_at.desc()).all()
    return [{"id": i.id, "email": i.email, "expires_at": i.expires_at.isoformat()} for i in invites]


@router.delete("/{invite_id}")
def revoke_invite(invite_id: str, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    """Revoke a pending invite."""
    tenant = get_current_tenant(db, session)
    invite = db.query(TenantInvite).filter(
        TenantInvite.id == invite_id,
        TenantInvite.tenant_id == tenant.id,
    ).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found.")
    db.delete(invite)
    db.commit()
    return {"ok": True}


def _send_invite_email(email: str, org_name: str, invite_url: str):
    if not settings.resend_api_key:
        logger.info(f"[DEV] Invite link for {email}: {invite_url}")
        return

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.get_auth_email_from(),
            "to": email,
            "subject": f"You've been invited to {org_name} on Pulse",
            "html": f"""
                <p>You've been invited to join <strong>{org_name}</strong> on Pulse.</p>
                <p><a href="{invite_url}" style="background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Accept invite</a></p>
                <p style="color:#888;font-size:12px;">This link expires in 7 days. If you didn't expect this invite, you can safely ignore it.</p>
            """,
        })
    except Exception as e:
        logger.error(f"Invite email failed for {email}: {e}")
