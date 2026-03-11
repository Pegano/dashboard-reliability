import re
import logging
import resend
from fastapi import APIRouter, HTTPException, Cookie
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.jwt import decode_session_token
from app.core.config import settings
from app.models.auth import Tenant, TenantUser, UserRole, User

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_user_id(session: str | None) -> str:
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_session_token(session)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid session")
    return payload["sub"]


def _slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:48] or "org"


class TestConnectionRequest(BaseModel):
    tenant_id: str
    client_id: str
    client_secret: str


class CreateTenantRequest(BaseModel):
    org_name: str
    tenant_id: str      # Azure tenant ID
    client_id: str
    client_secret: str
    workspace_ids: list[str]


@router.post("/test-connection")
def test_connection(body: TestConnectionRequest, session: str | None = Cookie(default=None)):
    _get_user_id(session)

    from msal import ConfidentialClientApplication
    try:
        app = ConfidentialClientApplication(
            client_id=body.client_id,
            client_credential=body.client_secret,
            authority=f"https://login.microsoftonline.com/{body.tenant_id}",
        )
        result = app.acquire_token_for_client(
            scopes=["https://analysis.windows.net/powerbi/api/.default"]
        )
        if "access_token" not in result:
            error = result.get("error_description", "Authentication failed")
            raise HTTPException(status_code=400, detail=error)

        # Haal workspaces op met dit token
        import requests
        r = requests.get(
            "https://api.powerbi.com/v1.0/myorg/groups",
            headers={"Authorization": f"Bearer {result['access_token']}"},
            timeout=10,
        )
        r.raise_for_status()
        workspaces = r.json().get("value", [])
        return {
            "ok": True,
            "workspaces": [{"id": w["id"], "name": w["name"]} for w in workspaces],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/complete")
def complete_onboarding(body: CreateTenantRequest, session: str | None = Cookie(default=None)):
    user_id = _get_user_id(session)
    db: Session = SessionLocal()
    try:
        # Maak tenant aan
        base_slug = _slug(body.org_name)
        slug = base_slug
        counter = 1
        while db.query(Tenant).filter(Tenant.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        tenant = Tenant(name=body.org_name, slug=slug)
        db.add(tenant)
        db.flush()

        # Koppel user als admin
        tenant_user = TenantUser(
            tenant_id=tenant.id,
            user_id=user_id,
            role=UserRole.admin,
        )
        db.add(tenant_user)

        # Sla Power BI credentials op (client_secret encrypted met Fernet)
        from app.core.crypto import encrypt
        tenant.pbi_tenant_id = body.tenant_id
        tenant.pbi_client_id = body.client_id
        tenant.pbi_client_secret = encrypt(body.client_secret)
        tenant.monitored_workspace_ids = body.workspace_ids

        db.commit()

        return {"ok": True, "tenant_id": tenant.id, "slug": tenant.slug}
    finally:
        db.close()


@router.post("/send-test-alert")
def send_test_alert(session: str | None = Cookie(default=None)):
    """Send a test alert email to the current user to verify alert delivery."""
    user_id = _get_user_id(session)
    db: Session = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        email = user.email

        if not settings.resend_api_key:
            logger.info(f"[DEV] Test alert would be sent to {email}")
            return {"ok": True, "email": email}

        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.get_auth_email_from(),
            "to": email,
            "subject": "Pulse is monitoring your Power BI environment",
            "html": f"""
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
                    <div style="background:#0d9488;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
                        <strong>✓ Pulse is active</strong>
                    </div>
                    <div style="background:#1c1c1e;color:#d8d9da;padding:24px;border-radius:0 0 8px 8px;">
                        <p>This is a test alert to confirm that Pulse can reach you.</p>
                        <p>You'll receive alerts like this when a dataset refresh fails, is delayed, or a schema change is detected.</p>
                        <br>
                        <a href="{settings.app_url}"
                           style="background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
                            Go to dashboard →
                        </a>
                        <p style="color:#6e7180;font-size:12px;margin-top:24px;">Pulse · Power BI monitoring</p>
                    </div>
                </div>
            """,
        })
        logger.info(f"Test alert sent to {email}")
        return {"ok": True, "email": email}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Test alert failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send test alert")
    finally:
        db.close()
