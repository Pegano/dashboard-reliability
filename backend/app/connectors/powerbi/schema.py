"""
Schema connector — haalt modelstructuur op via DAX COLUMNSTATISTICS().

Werkt op elke Power BI dataset met executeQueries toegang.
Geen XMLA, geen Premium vereist — alleen de normale REST API.
"""

import logging
import requests
from app.connectors.powerbi.auth import get_access_token

logger = logging.getLogger(__name__)

BASE_URL = "https://api.powerbi.com/v1.0/myorg"

# Systeemtabellen die Power BI automatisch aanmaakt — niet relevant voor schema change detectie
SYSTEM_TABLE_PREFIXES = (
    "LocalDateTable_",
    "DateTableTemplate_",
    "RowNumber-",
)


def get_model_columns(workspace_id: str, dataset_id: str) -> list[dict]:
    """
    Haal alle gebruikerstabellen en kolommen op via COLUMNSTATISTICS().

    Returns list of dicts:
        {
            "table_name": str,
            "column_name": str,
            "cardinality": int | None,
            "min_value": str | None,
            "max_value": str | None,
        }

    Returns [] als de dataset geen executeQueries ondersteunt (gateway-only, etc).
    """
    token = get_access_token()
    try:
        r = requests.post(
            f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/executeQueries",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "queries": [{"query": "EVALUATE COLUMNSTATISTICS()"}],
                "serializerSettings": {"includeNulls": True},
            },
            timeout=30,
        )
    except requests.RequestException as e:
        logger.warning(f"COLUMNSTATISTICS request failed for {dataset_id}: {e}")
        return []

    if r.status_code != 200:
        logger.debug(f"COLUMNSTATISTICS not available for {dataset_id}: HTTP {r.status_code}")
        return []

    try:
        rows = r.json()["results"][0]["tables"][0].get("rows", [])
    except (KeyError, IndexError):
        return []

    result = []
    for row in rows:
        table = row.get("[Table Name]", "")
        column = row.get("[Column Name]", "")

        # Skip system tables and internal RowNumber columns
        if any(table.startswith(p) for p in SYSTEM_TABLE_PREFIXES):
            continue
        if column.startswith("RowNumber-"):
            continue

        min_val = row.get("[Min]")
        data_type = type(min_val).__name__ if min_val is not None else None

        result.append({
            "table_name": table,
            "column_name": column,
            "cardinality": row.get("[Cardinality]"),
            "data_type": data_type,
            "min_value": str(min_val) if min_val is not None else None,
            "max_value": str(row["[Max]"]) if row.get("[Max]") is not None else None,
        })

    return result
