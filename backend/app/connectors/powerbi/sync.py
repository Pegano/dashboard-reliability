"""
Sync Power BI data naar de database.
Wordt aangeroepen door de scheduler elke poll cyclus.
"""

import datetime
import json
import logging
from sqlalchemy.orm import Session
from app.connectors.powerbi import client
from app.connectors.powerbi.schema import get_model_columns
from app.models.workspace import Workspace
from app.models.dataset import Dataset, RefreshStatus
from app.models.report import Report
from app.models.schema import DatasetColumn, DatasetSnapshot
from app.models.refresh_run import RefreshRun, RunStatus

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
    dataset.web_url = ds.get("webUrl")
    dataset.synced_at = datetime.datetime.utcnow()
    db.merge(dataset)
    db.flush()  # ensure dataset exists before inserting related rows

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

            # Sla elke history entry op als RefreshRun
            status_map = {
                "completed": RunStatus.completed,
                "failed": RunStatus.failed,
                "disabled": RunStatus.disabled,
                "cancelled": RunStatus.cancelled,
            }
            for entry in history:
                end_time_str = entry.get("endTime")
                run_id = entry.get("requestId") or f"{ds['id']}_{end_time_str}"

                run_status_raw = entry.get("status", "unknown").lower()
                run_status = status_map.get(run_status_raw, RunStatus.unknown)

                started_at = None
                if entry.get("startTime"):
                    started_at = datetime.datetime.fromisoformat(
                        entry["startTime"].replace("Z", "+00:00")
                    )

                ended_at = None
                if end_time_str:
                    ended_at = datetime.datetime.fromisoformat(
                        end_time_str.replace("Z", "+00:00")
                    )

                error_code = None
                error_description = None
                exc_json = entry.get("serviceExceptionJson")
                if exc_json:
                    try:
                        exc = json.loads(exc_json)
                        error_code = exc.get("errorCode")
                        error_description = exc.get("errorDescription")
                    except Exception:
                        pass

                run = db.get(RefreshRun, run_id) or RefreshRun(id=run_id)
                run.dataset_id = ds["id"]
                run.status = run_status
                run.started_at = started_at
                run.ended_at = ended_at
                run.error_code = error_code
                run.error_description = error_description
                db.merge(run)

    except Exception as e:
        logger.warning(f"Refresh history ophalen mislukt voor dataset {ds['id']}: {e}")

    # Datasources en refresh schedule ophalen
    try:
        raw_sources = client.get_datasources(workspace_id, ds["id"])
        dataset.datasources = [
            {
                "type": s.get("datasourceType"),
                "connection": s.get("connectionDetails", {}),
                "gatewayId": s.get("gatewayId"),
            }
            for s in raw_sources
        ]
    except Exception as e:
        logger.warning(f"Datasources ophalen mislukt voor dataset {ds['id']}: {e}")

    try:
        schedule = client.get_refresh_schedule(workspace_id, ds["id"])
        if schedule is not None:
            dataset.refresh_schedule_enabled = schedule.get("enabled", False)
            dataset.refresh_schedule_times = schedule.get("times", [])
    except Exception as e:
        logger.warning(f"Refresh schedule ophalen mislukt voor dataset {ds['id']}: {e}")

    # Schema ophalen via COLUMNSTATISTICS()
    try:
        columns = get_model_columns(workspace_id, ds["id"])
        if columns:
            _sync_schema(db, ds["id"], columns)
            _write_snapshot(db, ds["id"], columns)
    except Exception as e:
        logger.warning(f"Schema ophalen mislukt voor dataset {ds['id']}: {e}")


def _sync_schema(db: Session, dataset_id: str, columns: list[dict]) -> None:
    seen_ids = set()

    for col in columns:
        col_id = f"{dataset_id}/{col['table_name']}/{col['column_name']}"
        seen_ids.add(col_id)

        existing_col = db.get(DatasetColumn, col_id)
        new_type = col.get("data_type")

        if existing_col is None:
            column = DatasetColumn(
                id=col_id,
                dataset_id=dataset_id,
                table_name=col["table_name"],
                column_name=col["column_name"],
                data_type=new_type,
            )
        else:
            column = existing_col
            if new_type and column.data_type and new_type != column.data_type:
                # Type is gewijzigd — onthoud het vorige type
                logger.warning(f"Data type change: {col_id} — {column.data_type} → {new_type}")
                column.previous_data_type = column.data_type
                column.data_type = new_type
            elif new_type and column.previous_data_type and new_type == column.previous_data_type:
                # Type is teruggezet naar origineel — wis de type-change markering
                logger.info(f"Data type hersteld: {col_id} — terug naar {new_type}")
                column.previous_data_type = None
                column.data_type = new_type
            elif new_type:
                column.data_type = new_type

        column.is_active = True
        column.last_seen_at = datetime.datetime.utcnow()
        if col.get("cardinality") is not None:
            column.cardinality = col["cardinality"]
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


def _write_snapshot(db: Session, dataset_id: str, columns: list[dict]) -> None:
    """Schrijf een volumesnapshot op basis van cardinality + duur laatste succesvolle run."""
    now = datetime.datetime.utcnow()

    # Som van alle cardinalities als volumeproxy
    row_count_estimate = sum(
        c["cardinality"] for c in columns if c.get("cardinality") is not None
    ) or None

    # Duur van de meest recente succesvolle run
    last_run = db.query(RefreshRun).filter(
        RefreshRun.dataset_id == dataset_id,
        RefreshRun.status == RunStatus.completed,
        RefreshRun.started_at.isnot(None),
        RefreshRun.ended_at.isnot(None),
    ).order_by(RefreshRun.ended_at.desc()).first()

    duration_ms = None
    if last_run:
        duration_ms = int(
            (last_run.ended_at - last_run.started_at).total_seconds() * 1000
        )

    snapshot_id = f"{dataset_id}_{now.strftime('%Y%m%dT%H%M%S')}"
    snapshot = DatasetSnapshot(
        id=snapshot_id,
        dataset_id=dataset_id,
        synced_at=now,
        row_count_estimate=row_count_estimate,
        duration_ms=duration_ms,
    )
    db.add(snapshot)


def _sync_report(db: Session, workspace_id: str, rp: dict) -> None:
    report = db.get(Report, rp["id"]) or Report(id=rp["id"])
    report.workspace_id = workspace_id
    report.name = rp["name"]
    report.dataset_id = rp.get("datasetId")
    report.web_url = rp.get("webUrl")
    report.synced_at = datetime.datetime.utcnow()
    db.merge(report)
