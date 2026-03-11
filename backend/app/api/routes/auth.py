import datetime
import uuid
import logging
import resend
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.auth import User, AuthToken, Tenant, TenantUser, UserRole
from app.core.jwt import create_session_token

logger = logging.getLogger(__name__)
router = APIRouter()

MAGIC_LINK_EXPIRY_MINUTES = 15
SESSION_EXPIRY_HOURS = 24


class LoginRequest(BaseModel):
    email: EmailStr
    next: str | None = None


@router.post("/request")
def request_magic_link(body: LoginRequest):
    """Stuur een magic link naar het opgegeven e-mailadres."""
    db: Session = SessionLocal()
    try:
        # Haal bestaande user op of maak nieuwe aan
        user = db.query(User).filter(User.email == body.email).first()
        if not user:
            user = User(email=body.email)
            db.add(user)
            db.flush()

        # Maak een nieuw token aan (invalideer oude tokens niet — meerdere devices)
        token = str(uuid.uuid4())
        auth_token = AuthToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES),
        )
        db.add(auth_token)
        db.commit()

        # Stuur magic link via Resend
        next_param = f"&next={body.next}" if body.next else ""
        magic_url = f"{settings.app_url}/auth/verify?token={token}{next_param}"
        _send_magic_link_email(body.email, magic_url)

        return {"ok": True}
    finally:
        db.close()


@router.get("/verify")
def verify_magic_link(token: str, next: str | None = None, response: Response = None):
    """Verifieer een magic link token en maak een sessie aan."""
    db: Session = SessionLocal()
    try:
        auth_token = db.query(AuthToken).filter(AuthToken.token == token).first()

        if not auth_token or not auth_token.is_valid:
            raise HTTPException(status_code=400, detail="Invalid or expired token")

        # Token gebruiken — markeer als gebruikt
        auth_token.used_at = datetime.datetime.utcnow()
        db.commit()

        user = auth_token.user

        # Bepaal redirect: next param > onboarding check > home
        if next and next.startswith("/"):
            redirect_path = next
        else:
            tenant_user = db.query(TenantUser).filter(TenantUser.user_id == user.id).first()
            redirect_path = "/onboarding" if not tenant_user else "/"

        # Maak JWT sessie cookie
        jwt_token = create_session_token(user_id=user.id)

        redirect = RedirectResponse(url=f"{settings.app_url}{redirect_path}", status_code=302)
        redirect.set_cookie(
            key="session",
            value=jwt_token,
            httponly=True,
            secure=settings.app_url.startswith("https"),
            samesite="lax",
            max_age=SESSION_EXPIRY_HOURS * 3600,
        )
        return redirect
    finally:
        db.close()


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}


def _send_magic_link_email(email: str, magic_url: str):
    if not settings.resend_api_key:
        logger.info(f"[DEV] Magic link for {email}: {magic_url}")
        return

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.get_auth_email_from(),
            "to": email,
            "subject": "Your Pulse login link",
            "html": f"""
                <p>Click the link below to log in to Pulse. This link expires in {MAGIC_LINK_EXPIRY_MINUTES} minutes.</p>
                <p><a href="{magic_url}" style="background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Log in to Pulse</a></p>
                <p style="color:#888;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
            """,
        })
    except Exception as e:
        logger.error(f"Magic link email failed for {email}: {e}")
