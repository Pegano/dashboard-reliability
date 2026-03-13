"""
Sync Power BI data naar de database.
Wordt aangeroepen door de scheduler elke poll cyclus.
"""

import datetime
import json
import logging
from sqlalchemy.orm import Session
from app.connectors.powerbi import client
from app.connectors.powerbi.auth import get_access_token_for_tenant
from app.connectors.powerbi.schema import get_model_columns
from app.models.auth import Tenant
from app.models.workspace import Workspace
from app.models.dataset import Dataset, RefreshStatus
from app.models.report import Report
from app.models.schema import DatasetColumn, DatasetSnapshot
from app.models.refresh_run import RefreshRun, RunStatus
from app.models.dataflow import Dataflow, DataflowRun, DataflowRunStatus, DataflowStatus

logger = logging.getLogger(__name__)


def sync_all(db: Session) -> None:
    """Itereer over alle tenants en sync hun Power BI data."""
    tenants = db.query(Tenant).filter(
        Tenant.pbi_tenant_id.isnot(None),
        Tenant.pbi_client_id.isnot(None),
        Tenant.pbi_client_secret.isnot(None),
    ).all()

    logger.info(f"Start Power BI sync — {len(tenants)} tenant(s)")

    for tenant in tenants:
        try:
            _sync_tenant(db, tenant)
        except Exception as e:
            logger.error(f"Sync mislukt voor tenant {tenant.slug}: {e}", exc_info=True)

    logger.info("Sync voltooid")


def _sync_tenant(db: Session, tenant: Tenant) -> None:
    from app.core.crypto import decrypt
    try:
        client_secret = decrypt(tenant.pbi_client_secret)
    except Exception:
        # Fallback for legacy plaintext secrets (pre-encryption migration)
        client_secret = tenant.pbi_client_secret
    token = get_access_token_for_tenant(
        tenant.pbi_tenant_id,
        tenant.pbi_client_id,
        client_secret,
    )

    monitored = set(tenant.monitored_workspace_ids or [])
    all_workspaces = client.get_workspaces(token)

    # Alleen de geselecteerde workspaces syncen
    workspaces = [w for w in all_workspaces if not monitored or w["id"] in monitored]

    for ws in workspaces:
        _sync_workspace(db, ws, token, tenant.id)

    db.commit()
    logger.info(f"Tenant {tenant.slug}: {len(workspaces)} workspace(s) gesyncet")


def _sync_workspace(db: Session, ws: dict, token: str, tenant_id: str) -> None:
    workspace = db.get(Workspace, ws["id"]) or Workspace(id=ws["id"])
    workspace.tenant_id = tenant_id
    workspace.name = ws["name"]
    workspace.synced_at = datetime.datetime.utcnow()
    db.merge(workspace)

    datasets = client.get_datasets(ws["id"], token)
    for ds in datasets:
        _sync_dataset(db, ws["id"], ds, token, tenant_id)

    reports = client.get_reports(ws["id"], token)
    for rp in reports:
        _sync_report(db, ws["id"], rp)

    try:
        dataflows = client.get_dataflows(ws["id"], token)
        for df in dataflows:
            _sync_dataflow(db, ws["id"], df, token, tenant_id)
    except Exception as e:
        logger.warning(f"Dataflows ophalen mislukt voor workspace {ws['id']}: {e}")


def _sync_dataset(db: Session, workspace_id: str, ds: dict, token: str, tenant_id: str) -> None:
    dataset = db.get(Dataset, ds["id"]) or Dataset(id=ds["id"])
    dataset.tenant_id = tenant_id
    dataset.workspace_id = workspace_id
    dataset.name = ds["name"]
    dataset.web_url = ds.get("webUrl")
    dataset.synced_at = datetime.datetime.utcnow()

    # modifiedDateTime bijhouden voor desktop publish detectie
    prev_modified_at = dataset.modified_at
    new_modified_at = None
    if ds.get("modifiedDateTime"):
        try:
            new_modified_at = datetime.datetime.fromisoformat(
                ds["modifiedDateTime"].replace("Z", "+00:00")
            ).replace(tzinfo=None)
        except Exception:
            pass
    dataset.modified_at = new_modified_at

    db.merge(dataset)
    db.flush()  # ensure dataset exists before inserting related rows

    # Refresh history ophalen
    try:
        history = client.get_refresh_history(workspace_id, ds["id"], token)
        if history:
            latest = history[0]
            status = latest.get("status", "unknown").lower()
            dataset.refresh_status = RefreshStatus[status] if status in RefreshStatus.__members__ else RefreshStatus.unknown
            if latest.get("endTime"):
                dataset.last_refresh_at = datetime.datetime.fromisoformat(
                    latest["endTime"].replace("Z", "+00:00")
                )

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
                run.refresh_type = entry.get("refreshType")
                run.started_at = started_at
                run.ended_at = ended_at
                run.error_code = error_code
                run.error_description = error_description
                db.merge(run)

    except Exception as e:
        logger.warning(f"Refresh history ophalen mislukt voor dataset {ds['id']}: {e}")

    # Desktop publish detectie
    if (
        new_modified_at is not None
        and prev_modified_at is not None
        and new_modified_at > prev_modified_at
    ):
        existing_run = db.query(RefreshRun).filter(
            RefreshRun.dataset_id == ds["id"],
            RefreshRun.started_at >= prev_modified_at,
        ).first()
        if not existing_run:
            synthetic_id = f"{ds['id']}_publish_{new_modified_at.strftime('%Y%m%dT%H%M%S')}"
            if not db.get(RefreshRun, synthetic_id):
                synthetic_run = RefreshRun(
                    id=synthetic_id,
                    dataset_id=ds["id"],
                    status=RunStatus.completed,
                    refresh_type="publish",
                    started_at=new_modified_at,
                    ended_at=new_modified_at,
                )
                db.add(synthetic_run)
                logger.info(f"Desktop publish gedetecteerd voor dataset {ds['id']} op {new_modified_at}")

    # Datasources en refresh schedule ophalen
    try:
        raw_sources = client.get_datasources(workspace_id, ds["id"], token)
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
        schedule = client.get_refresh_schedule(workspace_id, ds["id"], token)
        if schedule is not None:
            dataset.refresh_schedule_enabled = schedule.get("enabled", False)
            dataset.refresh_schedule_times = schedule.get("times", [])
    except Exception as e:
        logger.warning(f"Refresh schedule ophalen mislukt voor dataset {ds['id']}: {e}")

    # Schema ophalen via COLUMNSTATISTICS()
    try:
        columns = get_model_columns(workspace_id, ds["id"], token)
        if columns:
            _sync_schema(db, ds["id"], columns)
            _write_snapshot(db, ds["id"], columns)
    except Exception as e:
        logger.warning(f"Schema ophalen mislukt voor dataset {ds['id']}: {e}")

    # Dataset parameters ophalen
    try:
        params = client.get_dataset_parameters(workspace_id, ds["id"], token)
        dataset.parameters = [
            {"name": p.get("name"), "type": p.get("type"), "currentValue": p.get("currentValue")}
            for p in params
        ] or None
    except Exception as e:
        logger.warning(f"Parameters ophalen mislukt voor dataset {ds['id']}: {e}")

    # Upstream dataflows ophalen (welke dataflows voeden deze dataset)
    try:
        upstream = client.get_upstream_dataflows(workspace_id, ds["id"], token)
        dataset.upstream_dataflow_ids = [u.get("dataflowId") for u in upstream if u.get("dataflowId")] or None
    except Exception as e:
        logger.warning(f"Upstream dataflows ophalen mislukt voor dataset {ds['id']}: {e}")


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
                logger.warning(f"Data type change: {col_id} — {column.data_type} → {new_type}")
                column.previous_data_type = column.data_type
                column.data_type = new_type
            elif new_type and column.previous_data_type and new_type == column.previous_data_type:
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

    row_count_estimate = sum(
        c["cardinality"] for c in columns if c.get("cardinality") is not None
    ) or None

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


def _sync_dataflow(db: Session, workspace_id: str, df: dict, token: str, tenant_id: str) -> None:
    dataflow = db.get(Dataflow, df["objectId"]) or Dataflow(id=df["objectId"])
    dataflow.tenant_id = tenant_id
    dataflow.workspace_id = workspace_id
    dataflow.name = df.get("name", "")
    dataflow.description = df.get("description")
    dataflow.synced_at = datetime.datetime.utcnow()
    db.merge(dataflow)
    db.flush()

    # Transaction history ophalen
    try:
        transactions = client.get_dataflow_transactions(workspace_id, df["objectId"], token)
        if transactions:
            latest = transactions[0]
            raw_status = latest.get("status", "InProgress")
            try:
                dataflow.refresh_status = DataflowStatus[raw_status.lower()] if raw_status.lower() in DataflowStatus.__members__ else DataflowStatus.unknown
            except Exception:
                dataflow.refresh_status = DataflowStatus.unknown

            if latest.get("endTime"):
                try:
                    dataflow.last_refresh_at = datetime.datetime.fromisoformat(
                        latest["endTime"].replace("Z", "+00:00")
                    )
                except Exception:
                    pass

            status_map = {
                "success": DataflowRunStatus.Success,
                "failed": DataflowRunStatus.Failed,
                "cancelled": DataflowRunStatus.Cancelled,
                "inprogress": DataflowRunStatus.InProgress,
            }

            for tx in transactions:
                tx_id = tx.get("id") or tx.get("transactionId")
                if not tx_id:
                    continue

                raw_tx_status = (tx.get("status") or "InProgress").lower()
                tx_status = status_map.get(raw_tx_status, DataflowRunStatus.InProgress)

                started_at = None
                if tx.get("startTime"):
                    try:
                        started_at = datetime.datetime.fromisoformat(
                            tx["startTime"].replace("Z", "+00:00")
                        )
                    except Exception:
                        pass

                ended_at = None
                if tx.get("endTime"):
                    try:
                        ended_at = datetime.datetime.fromisoformat(
                            tx["endTime"].replace("Z", "+00:00")
                        )
                    except Exception:
                        pass

                run = db.get(DataflowRun, tx_id) or DataflowRun(id=tx_id)
                run.dataflow_id = df["objectId"]
                run.status = tx_status
                run.started_at = started_at
                run.ended_at = ended_at
                run.error_code = tx.get("errorCode")
                run.error_message = tx.get("errorMessage") or tx.get("error")

                # Entity detail ophalen voor elke transactie (altijd, niet alleen bij failure)
                # Nodig voor visuele flow weergave met doorlooptijden per stap
                try:
                    entities = client.get_dataflow_transaction_detail(
                        workspace_id, df["objectId"], tx_id, token
                    )
                    if entities:
                        run.entities = [
                            {
                                "name": e.get("entityName") or e.get("name"),
                                "status": e.get("status"),
                                "startTime": e.get("startTime"),
                                "endTime": e.get("endTime"),
                                "error": e.get("error"),
                            }
                            for e in entities
                        ]
                except Exception as e:
                    logger.debug(f"Entity detail ophalen mislukt voor transactie {tx_id}: {e}")

                db.merge(run)

    except Exception as e:
        logger.warning(f"Dataflow transactions ophalen mislukt voor dataflow {df['objectId']}: {e}")
