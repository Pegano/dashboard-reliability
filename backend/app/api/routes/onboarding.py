import re
import logging
from fastapi import APIRouter, HTTPException, Cookie
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.jwt import decode_session_token
from app.models.auth import Tenant, TenantUser, UserRole

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

        # Sla Power BI credentials op (encrypted in volgende stap, nu plaintext in tenant)
        # TODO: encrypt with Fernet before storing
        tenant.pbi_tenant_id = body.tenant_id
        tenant.pbi_client_id = body.client_id
        tenant.pbi_client_secret = body.client_secret
        tenant.monitored_workspace_ids = body.workspace_ids

        db.commit()

        return {"ok": True, "tenant_id": tenant.id, "slug": tenant.slug}
    finally:
        db.close()
