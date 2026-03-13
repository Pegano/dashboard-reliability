import requests

BASE_URL = "https://api.powerbi.com/v1.0/myorg"


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def get_workspaces(token: str) -> list[dict]:
    r = requests.get(f"{BASE_URL}/groups", headers=_h(token))
    r.raise_for_status()
    return r.json().get("value", [])


def get_datasets(workspace_id: str, token: str) -> list[dict]:
    r = requests.get(f"{BASE_URL}/groups/{workspace_id}/datasets", headers=_h(token))
    r.raise_for_status()
    return r.json().get("value", [])


def get_reports(workspace_id: str, token: str) -> list[dict]:
    r = requests.get(f"{BASE_URL}/groups/{workspace_id}/reports", headers=_h(token))
    r.raise_for_status()
    return r.json().get("value", [])


def get_refresh_history(workspace_id: str, dataset_id: str, token: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/refreshes",
        headers=_h(token),
    )
    r.raise_for_status()
    return r.json().get("value", [])


def get_dataset_tables(workspace_id: str, dataset_id: str, token: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/tables",
        headers=_h(token),
    )
    r.raise_for_status()
    return r.json().get("value", [])


def get_datasources(workspace_id: str, dataset_id: str, token: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/datasources",
        headers=_h(token),
    )
    r.raise_for_status()
    return r.json().get("value", [])


def get_refresh_schedule(workspace_id: str, dataset_id: str, token: str) -> dict | None:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/refreshSchedule",
        headers=_h(token),
    )
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


def get_dataset_parameters(workspace_id: str, dataset_id: str, token: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/parameters",
        headers=_h(token),
    )
    if r.status_code in (400, 404):
        return []
    r.raise_for_status()
    return r.json().get("value", [])


def get_upstream_dataflows(workspace_id: str, dataset_id: str, token: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/upstreamDataflows",
        headers=_h(token),
    )
    if r.status_code in (400, 404):
        return []
    r.raise_for_status()
    return r.json().get("value", [])


def get_dataflows(workspace_id: str, token: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/dataflows",
        headers=_h(token),
    )
    r.raise_for_status()
    return r.json().get("value", [])


def get_dataflow_transactions(workspace_id: str, dataflow_id: str, token: str) -> list[dict]:
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/dataflows/{dataflow_id}/transactions",
        headers=_h(token),
    )
    if r.status_code in (400, 404):
        return []
    r.raise_for_status()
    return r.json().get("value", [])


def get_dataflow_transaction_detail(
    workspace_id: str, dataflow_id: str, transaction_id: str, token: str
) -> list[dict]:
    """Returns entity-level detail for a single transaction (which step failed/succeeded)."""
    r = requests.get(
        f"{BASE_URL}/groups/{workspace_id}/dataflows/{dataflow_id}/transactions/{transaction_id}",
        headers=_h(token),
    )
    if r.status_code in (400, 404):
        return []
    r.raise_for_status()
    data = r.json()
    # Response may be a single object with an "entities" list, or a list directly
    if isinstance(data, list):
        return data
    return data.get("entities", [])
