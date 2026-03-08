import requests
from auth import get_access_token

BASE_URL = "https://api.powerbi.com/v1.0/myorg"


def get_headers() -> dict:
    token = get_access_token()
    return {"Authorization": f"Bearer {token}"}


def get_workspaces() -> list:
    response = requests.get(f"{BASE_URL}/groups", headers=get_headers())
    response.raise_for_status()
    return response.json().get("value", [])


def get_datasets(workspace_id: str) -> list:
    response = requests.get(f"{BASE_URL}/groups/{workspace_id}/datasets", headers=get_headers())
    response.raise_for_status()
    return response.json().get("value", [])


def get_refresh_history(workspace_id: str, dataset_id: str) -> list:
    response = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/refreshes",
        headers=get_headers(),
    )
    response.raise_for_status()
    return response.json().get("value", [])


def get_reports(workspace_id: str) -> list:
    response = requests.get(f"{BASE_URL}/groups/{workspace_id}/reports", headers=get_headers())
    response.raise_for_status()
    return response.json().get("value", [])
