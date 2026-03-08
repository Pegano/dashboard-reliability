import requests
from app.connectors.powerbi.auth import get_access_token

BASE_URL = "https://api.powerbi.com/v1.0/myorg"


def _headers() -> dict:
    return {"Authorization": f"Bearer {get_access_token()}"}


def get_workspaces() -> list[dict]:
    r = requests.get(f"{BASE_URL}/groups", headers=_headers())
    r.raise_for_status()
    return r.json().get("value", [])


def get_datasets(workspace_id: str) -> list[dict]:
    r = requests.get(f"{BASE_URL}/groups/{workspace_id}/datasets", headers=_headers())
    r.raise_for_status()
    return r.json().get("value", [])


def get_reports(workspace_id: str) -> list[dict]:
    r = requests.get(f"{BASE_URL}/groups/{workspace_id}/reports", headers=_headers())
    r.raise_for_status()
    return r.json().get("value", [])


def get_refresh_history(workspace_id: str, dataset_id: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/refreshes",
        headers=_headers(),
    )
    r.raise_for_status()
    return r.json().get("value", [])


def get_dataset_tables(workspace_id: str, dataset_id: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/tables",
        headers=_headers(),
    )
    r.raise_for_status()
    return r.json().get("value", [])
