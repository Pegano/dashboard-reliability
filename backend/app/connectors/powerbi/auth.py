import msal

SCOPE = ["https://analysis.windows.net/powerbi/api/.default"]

_app_cache: dict = {}


def get_access_token_for_tenant(pbi_tenant_id: str, client_id: str, client_secret: str) -> str:
    """Haal een access token op voor een specifieke tenant (via service principal)."""
    cache_key = (pbi_tenant_id, client_id)
    app = _app_cache.get(cache_key)
    if app is None:
        app = msal.ConfidentialClientApplication(
            client_id,
            authority=f"https://login.microsoftonline.com/{pbi_tenant_id}",
            client_credential=client_secret,
        )
        _app_cache[cache_key] = app

    result = app.acquire_token_for_client(scopes=SCOPE)
    if "access_token" not in result:
        raise Exception(f"Power BI auth failed: {result.get('error_description', result)}")
    return result["access_token"]

