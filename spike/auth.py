import os
from dotenv import load_dotenv
import msal

load_dotenv()

TENANT_ID = os.getenv("POWERBI_TENANT_ID")
CLIENT_ID = os.getenv("POWERBI_CLIENT_ID")
CLIENT_SECRET = os.getenv("POWERBI_CLIENT_SECRET")

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPE = ["https://analysis.windows.net/powerbi/api/.default"]


def get_access_token() -> str:
    app = msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET,
    )

    result = app.acquire_token_for_client(scopes=SCOPE)

    if "access_token" not in result:
        raise Exception(f"Auth failed: {result.get('error_description', result)}")

    return result["access_token"]
