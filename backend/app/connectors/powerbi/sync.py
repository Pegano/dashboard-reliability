"""
Sync Power BI data naar de database.
Wordt aangeroepen door de scheduler elke poll cyclus.
"""

import datetime
import logging
from sqlalchemy.orm import Session
from app.connectors.powerbi import client
from app.models.workspace import Workspace
from app.models.dataset import Dataset, RefreshStatus
from app.models.report import Report
from app.models.schema import DatasetColumn

logger = logging.getLogger(__name__)


def sync_all(db: Session) -> None:
    logger.info("Start Power BI sync")
    workspaces = client.get_workspaces()

    for ws in workspaces:
        _sync_workspace(db, ws)

    db.commit()
    logger.info(f"Sync voltooid: {len(workspaces)} workspace(s) verwerkt")


def _sync_workspace(db: Session, ws: dict) -> None:
    workspace = db.get(Workspace, ws["id"]) or Workspace(id=ws["id"])
    workspace.name = ws["name"]
    workspace.synced_at = datetime.datetime.utcnow()
    db.merge(workspace)

    datasets = client.get_datasets(ws["id"])
    for ds in datasets:
        _sync_dataset(db, ws["id"], ds)

    reports = client.get_reports(ws["id"])
    for rp in reports:
        _sync_report(db, ws["id"], rp)


def _sync_dataset(db: Session, workspace_id: str, ds: dict) -> None:
    dataset = db.get(Dataset, ds["id"]) or Dataset(id=ds["id"])
    dataset.workspace_id = workspace_id
    dataset.name = ds["name"]
    dataset.synced_at = datetime.datetime.utcnow()

    # Refresh history ophalen
    try:
        history = client.get_refresh_history(workspace_id, ds["id"])
        if history:
            latest = history[0]
            status = latest.get("status", "unknown").lower()
            dataset.refresh_status = RefreshStatus[status] if status in RefreshStatus.__members__ else RefreshStatus.unknown
            if latest.get("endTime"):
                dataset.last_refresh_at = datetime.datetime.fromisoformat(
                    latest["endTime"].replace("Z", "+00:00")
                )
    except Exception as e:
        logger.warning(f"Refresh history ophalen mislukt voor dataset {ds['id']}: {e}")

    db.merge(dataset)

    # Schema ophalen
    try:
        tables = client.get_dataset_tables(workspace_id, ds["id"])
        _sync_schema(db, ds["id"], tables)
    except Exception as e:
        logger.warning(f"Schema ophalen mislukt voor dataset {ds['id']}: {e}")


def _sync_schema(db: Session, dataset_id: str, tables: list[dict]) -> None:
    seen_ids = set()

    for table in tables:
        for col in table.get("columns", []):
            col_id = f"{dataset_id}/{table['name']}/{col['name']}"
            seen_ids.add(col_id)

            column = db.get(DatasetColumn, col_id) or DatasetColumn(
                id=col_id,
                dataset_id=dataset_id,
                table_name=table["name"],
                column_name=col["name"],
            )
            column.data_type = col.get("dataType")
            column.is_active = True
            column.last_seen_at = datetime.datetime.utcnow()
            db.merge(column)

    # Kolommen die verdwenen zijn markeren als inactief
    existing = db.query(DatasetColumn).filter(
        DatasetColumn.dataset_id == dataset_id,
        DatasetColumn.is_active == True,
    ).all()

    for col in existing:
        if col.id not in seen_ids:
            col.is_active = False
            logger.info(f"Schema change gedetecteerd: kolom {col.id} verdwenen")


def _sync_report(db: Session, workspace_id: str, rp: dict) -> None:
    report = db.get(Report, rp["id"]) or Report(id=rp["id"])
    report.workspace_id = workspace_id
    report.name = rp["name"]
    report.dataset_id = rp.get("datasetId")
    report.synced_at = datetime.datetime.utcnow()
    db.merge(report)
