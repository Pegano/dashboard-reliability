import msal
from app.core.config import settings

AUTHORITY = f"https://login.microsoftonline.com/{settings.powerbi_tenant_id}"
SCOPE = ["https://analysis.windows.net/powerbi/api/.default"]

_app = None


def _get_msal_app() -> msal.ConfidentialClientApplication:
    global _app
    if _app is None:
        _app = msal.ConfidentialClientApplication(
            settings.powerbi_client_id,
            authority=AUTHORITY,
            client_credential=settings.powerbi_client_secret,
        )
    return _app


def get_access_token() -> str:
    app = _get_msal_app()
    result = app.acquire_token_for_client(scopes=SCOPE)

    if "access_token" not in result:
        raise Exception(f"Power BI auth failed: {result.get('error_description', result)}")

    return result["access_token"]
