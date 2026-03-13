"""
Detectie engine — Layer 1 checks.
Draait na elke sync cyclus.
"""

import datetime
import logging
import re
import uuid
from sqlalchemy.orm import Session
from app.models.dataset import Dataset, RefreshStatus
from app.models.schema import DatasetColumn, DatasetSnapshot
from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.models.refresh_run import RefreshRun, RunStatus
from app.models.dataflow import Dataflow, DataflowRun, DataflowRunStatus, DataflowStatus

logger = logging.getLogger(__name__)

REFRESH_DELAY_HOURS = 24  # incident als dataset langer dan X uur niet gerefresht is

# Error description patterns die wijzen op een schema-gerelateerde oorzaak
_SCHEMA_HINT_PATTERNS = [
    (re.compile(r"column does not exist", re.I), "missing_column"),
    (re.compile(r"DataFormat\.Error", re.I), "type_mismatch"),
    (re.compile(r"couldn'?t convert", re.I), "type_mismatch"),
    (re.compile(r"type mismatch", re.I), "type_mismatch"),
    (re.compile(r"table.*not found|relation.*does not exist", re.I), "missing_table"),
]


def _parse_error_description(error_description: str | None) -> dict:
    """
    Parseer Power BI error description.
    Extraheert kolomnamen uit <oii>...</oii> tags en detecteert schema-hint patronen.
    Returns dict met 'columns' (list) en 'schema_hint' (str | None).
    """
    if not error_description:
        return {"columns": [], "schema_hint": None}

    columns = re.findall(r"<oii>(.*?)</oii>", error_description)

    schema_hint = None
    for pattern, hint_type in _SCHEMA_HINT_PATTERNS:
        if pattern.search(error_description):
            schema_hint = hint_type
            break

    return {"columns": columns, "schema_hint": schema_hint}


def run_all_checks(
    db: Session,
    datasets: list[Dataset] | None = None,
    dataflows: list[Dataflow] | None = None,
) -> list[Incident]:
    new_incidents = []
    if datasets is None:
        datasets = db.query(Dataset).all()

    for dataset in datasets:
        auto_resolve(db, dataset)
        new_incidents += check_refresh_failed(db, dataset)
        new_incidents += check_refresh_delayed(db, dataset)
        new_incidents += check_schema_changes(db, dataset)
        new_incidents += check_refresh_slow(db, dataset)
        new_incidents += check_dataset_growth(db, dataset)

    if dataflows is None:
        dataflows = db.query(Dataflow).all()

    for dataflow in dataflows:
        auto_resolve_dataflow(db, dataflow)
        new_incidents += check_dataflow_failed(db, dataflow)
        new_incidents += check_dataflow_delayed(db, dataflow)

    if new_incidents:
        db.add_all(new_incidents)
        db.commit()
        logger.info(f"{len(new_incidents)} nieuwe incident(en) aangemaakt")

    return new_incidents


def auto_resolve(db: Session, dataset: Dataset) -> None:
    """Sluit actieve incidents automatisch als de conditie niet meer geldt."""
    now = datetime.datetime.utcnow()
    active = db.query(Incident).filter(
        Incident.dataset_id == dataset.id,
        Incident.status.in_([IncidentStatus.active, IncidentStatus.suppressed]),
    ).all()

    for incident in active:
        resolved = False

        if incident.type == "refresh_failed":
            resolved = dataset.refresh_status != RefreshStatus.failed

        elif incident.type == "refresh_delayed":
            if dataset.last_refresh_at:
                last_refresh = dataset.last_refresh_at.replace(tzinfo=None) if dataset.last_refresh_at.tzinfo else dataset.last_refresh_at
                resolved = (now - last_refresh).total_seconds() / 3600 < REFRESH_DELAY_HOURS
            else:
                resolved = False

        elif incident.type == "schema_change":
            inactive_cols = db.query(DatasetColumn).filter(
                DatasetColumn.dataset_id == dataset.id,
                DatasetColumn.is_active == False,
            ).count()
            type_changed_cols = db.query(DatasetColumn).filter(
                DatasetColumn.dataset_id == dataset.id,
                DatasetColumn.is_active == True,
                DatasetColumn.previous_data_type != None,
            ).count()
            resolved = inactive_cols == 0 and type_changed_cols == 0

        elif incident.type == "refresh_slow":
            # Opgelost als de meest recente run weer binnen de baseline valt
            runs = db.query(RefreshRun).filter(
                RefreshRun.dataset_id == dataset.id,
                RefreshRun.status == RunStatus.completed,
                RefreshRun.started_at.isnot(None),
                RefreshRun.ended_at.isnot(None),
            ).order_by(RefreshRun.ended_at.desc()).limit(BASELINE_RUNS + 1).all()
            if len(runs) >= 3:
                last_ms = int((runs[0].ended_at - runs[0].started_at).total_seconds() * 1000)
                baseline_ms = sum(
                    int((r.ended_at - r.started_at).total_seconds() * 1000) for r in runs[1:]
                ) / len(runs[1:])
                resolved = baseline_ms < 1000 or last_ms < (baseline_ms * SLOW_RUN_FACTOR)

        elif incident.type == "dataset_growth":
            # Opgelost als volume weer binnen de baseline valt (bijv. na truncate/reload)
            snapshots = db.query(DatasetSnapshot).filter(
                DatasetSnapshot.dataset_id == dataset.id,
                DatasetSnapshot.row_count_estimate.isnot(None),
            ).order_by(DatasetSnapshot.synced_at.desc()).limit(BASELINE_SNAPSHOTS + 1).all()
            if len(snapshots) >= 3:
                baseline_vol = sum(s.row_count_estimate for s in snapshots[1:]) / len(snapshots[1:])
                resolved = baseline_vol < 100 or snapshots[0].row_count_estimate < (baseline_vol * GROWTH_FACTOR)

        if resolved:
            incident.status = IncidentStatus.resolved
            incident.resolved_at = now
            logger.info(f"Auto-resolved incident {incident.type} for dataset {dataset.name}")

    db.commit()


def check_refresh_failed(db: Session, dataset: Dataset) -> list[Incident]:
    if dataset.refresh_status != RefreshStatus.failed:
        return []

    if _active_incident_exists(db, dataset.id, "refresh_failed"):
        return []

    # Haal error code op uit meest recente gefaalde run
    last_failed_run = db.query(RefreshRun).filter(
        RefreshRun.dataset_id == dataset.id,
        RefreshRun.status == RunStatus.failed,
    ).order_by(RefreshRun.ended_at.desc()).first()

    error_code = last_failed_run.error_code if last_failed_run else None
    error_description = last_failed_run.error_description if last_failed_run else None

    parsed = _parse_error_description(error_description)

    # Bouw hint op basis van error code + schema-signalen
    if parsed["schema_hint"] == "missing_column" and parsed["columns"]:
        col_list = ", ".join(f"'{c}'" for c in parsed["columns"])
        hint = f"Column {col_list} not found in datasource — likely removed or renamed."
    elif parsed["schema_hint"] == "type_mismatch" and parsed["columns"]:
        col_list = ", ".join(f"'{c}'" for c in parsed["columns"])
        hint = f"Data type mismatch on column {col_list} — source type may have changed."
    elif parsed["schema_hint"] == "type_mismatch":
        hint = "Data type mismatch detected — a column type in the datasource may have changed."
    elif parsed["schema_hint"] == "missing_table":
        hint = "A table referenced by this dataset no longer exists in the datasource."
    else:
        hint = error_code if error_code else None

    detail = re.sub(r"</?oii>", "", error_description) if error_description else None

    logger.warning(f"Refresh mislukt: {dataset.name} — {error_code}")
    return [Incident(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        type="refresh_failed",
        severity=IncidentSeverity.critical,
        root_cause_hint=hint,
        detail=detail,
    )]


def check_refresh_delayed(db: Session, dataset: Dataset) -> list[Incident]:
    if not dataset.last_refresh_at:
        return []

    now = datetime.datetime.utcnow()
    # Maak last_refresh_at timezone-naïef voor vergelijking
    last_refresh = dataset.last_refresh_at.replace(tzinfo=None) if dataset.last_refresh_at.tzinfo else dataset.last_refresh_at
    hours_since_refresh = (now - last_refresh).total_seconds() / 3600

    if hours_since_refresh < REFRESH_DELAY_HOURS:
        return []

    if _active_incident_exists(db, dataset.id, "refresh_delayed"):
        return []

    logger.warning(f"Refresh vertraagd: {dataset.name} ({hours_since_refresh:.0f} uur geleden)")
    return [Incident(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        type="refresh_delayed",
        severity=IncidentSeverity.warning,
        root_cause_hint=f"Dataset has not been refreshed for {hours_since_refresh:.0f} hours. Check the refresh schedule.",
        detail=f"Last successful refresh: {dataset.last_refresh_at.isoformat()}",
    )]


def check_schema_changes(db: Session, dataset: Dataset) -> list[Incident]:
    removed_columns = db.query(DatasetColumn).filter(
        DatasetColumn.dataset_id == dataset.id,
        DatasetColumn.is_active == False,
    ).all()

    type_changed_columns = db.query(DatasetColumn).filter(
        DatasetColumn.dataset_id == dataset.id,
        DatasetColumn.is_active == True,
        DatasetColumn.previous_data_type != None,
    ).all()

    if not removed_columns and not type_changed_columns:
        return []

    if _active_incident_exists(db, dataset.id, "schema_change"):
        return []

    details = []
    if removed_columns:
        col_names = ", ".join(f"{dataset.name}.{c.table_name}.{c.column_name}" for c in removed_columns)
        details.append(f"Removed columns: {col_names}")
        logger.warning(f"Schema change: {dataset.name} — verdwenen kolommen: {col_names}")

    if type_changed_columns:
        type_changes = ", ".join(
            f"{dataset.name}.{c.table_name}.{c.column_name} ({c.previous_data_type} → {c.data_type})"
            for c in type_changed_columns
        )
        details.append(f"Type changes: {type_changes}")
        logger.warning(f"Schema change: {dataset.name} — type wijzigingen: {type_changes}")

    return [Incident(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        type="schema_change",
        severity=IncidentSeverity.critical,
        root_cause_hint="Column structure changed. Reports using affected columns may break.",
        detail=" | ".join(details),
    )]


SLOW_RUN_FACTOR = 2.0    # factor boven baseline = incident
GROWTH_FACTOR = 2.0      # factor boven baseline = incident
BASELINE_RUNS = 10       # aantal runs voor duur-baseline
BASELINE_SNAPSHOTS = 4   # aantal snapshots voor volume-baseline


def _fmt_ms(ms: int) -> str:
    secs = round(ms / 1000)
    mins = secs // 60
    s = secs % 60
    return f"{mins}m {s}s" if mins > 0 else f"{s}s"


def _fmt_volume(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}K"
    return str(n)


def check_refresh_slow(db: Session, dataset: Dataset) -> list[Incident]:
    """Detecteer als de laatste run significant langer duurde dan de baseline."""
    if _active_incident_exists(db, dataset.id, "refresh_slow"):
        return []

    # Laatste N succesvolle runs met bekende duur
    runs = db.query(RefreshRun).filter(
        RefreshRun.dataset_id == dataset.id,
        RefreshRun.status == RunStatus.completed,
        RefreshRun.started_at.isnot(None),
        RefreshRun.ended_at.isnot(None),
    ).order_by(RefreshRun.ended_at.desc()).limit(BASELINE_RUNS + 1).all()

    if len(runs) < 3:
        return []

    last_run = runs[0]
    baseline_runs = runs[1:]  # vergelijk tov vorige runs, niet tov zichzelf

    last_ms = int((last_run.ended_at - last_run.started_at).total_seconds() * 1000)
    baseline_ms = sum(
        int((r.ended_at - r.started_at).total_seconds() * 1000) for r in baseline_runs
    ) / len(baseline_runs)

    if baseline_ms < 1000 or last_ms < (baseline_ms * SLOW_RUN_FACTOR):
        return []

    detail = (
        f"Last run: {_fmt_ms(last_ms)} — "
        f"avg last {len(baseline_runs)} runs: {_fmt_ms(int(baseline_ms))} "
        f"({last_ms / baseline_ms:.1f}x slower)"
    )
    logger.warning(f"Trage refresh: {dataset.name} — {detail}")
    return [Incident(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        type="refresh_slow",
        severity=IncidentSeverity.warning,
        root_cause_hint=None,
        detail=detail,
    )]


def check_dataset_growth(db: Session, dataset: Dataset) -> list[Incident]:
    """Detecteer als het datavolume significant is gegroeid t.o.v. de baseline."""
    if _active_incident_exists(db, dataset.id, "dataset_growth"):
        return []

    snapshots = db.query(DatasetSnapshot).filter(
        DatasetSnapshot.dataset_id == dataset.id,
        DatasetSnapshot.row_count_estimate.isnot(None),
    ).order_by(DatasetSnapshot.synced_at.desc()).limit(BASELINE_SNAPSHOTS + 1).all()

    if len(snapshots) < 3:
        return []

    latest = snapshots[0]
    baseline_snapshots = snapshots[1:]

    baseline_vol = sum(s.row_count_estimate for s in baseline_snapshots) / len(baseline_snapshots)

    if baseline_vol < 100 or latest.row_count_estimate < (baseline_vol * GROWTH_FACTOR):
        return []

    detail = (
        f"Current volume: {_fmt_volume(latest.row_count_estimate)} — "
        f"avg last {len(baseline_snapshots)} syncs: {_fmt_volume(int(baseline_vol))} "
        f"({latest.row_count_estimate / baseline_vol:.1f}x larger)"
    )
    logger.warning(f"Dataset groei: {dataset.name} — {detail}")
    return [Incident(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        type="dataset_growth",
        severity=IncidentSeverity.warning,
        root_cause_hint=None,
        detail=detail,
    )]


def _active_incident_exists(db: Session, dataset_id: str, incident_type: str) -> bool:
    """Returns True if there's an active OR suppressed incident — don't create a duplicate."""
    return db.query(Incident).filter(
        Incident.dataset_id == dataset_id,
        Incident.type == incident_type,
        Incident.status.in_([IncidentStatus.active, IncidentStatus.suppressed]),
    ).first() is not None


def _active_dataflow_incident_exists(db: Session, dataflow_id: str, incident_type: str) -> bool:
    return db.query(Incident).filter(
        Incident.dataflow_id == dataflow_id,
        Incident.type == incident_type,
        Incident.status.in_([IncidentStatus.active, IncidentStatus.suppressed]),
    ).first() is not None


DATAFLOW_DELAY_HOURS = 24


def auto_resolve_dataflow(db: Session, dataflow: Dataflow) -> None:
    now = datetime.datetime.utcnow()
    active = db.query(Incident).filter(
        Incident.dataflow_id == dataflow.id,
        Incident.status.in_([IncidentStatus.active, IncidentStatus.suppressed]),
    ).all()

    for incident in active:
        resolved = False

        if incident.type == "dataflow_failed":
            resolved = dataflow.refresh_status != DataflowStatus.failed

        elif incident.type == "dataflow_delayed":
            if dataflow.last_refresh_at:
                last = dataflow.last_refresh_at.replace(tzinfo=None) if dataflow.last_refresh_at.tzinfo else dataflow.last_refresh_at
                resolved = (now - last).total_seconds() / 3600 < DATAFLOW_DELAY_HOURS

        if resolved:
            incident.status = IncidentStatus.resolved
            incident.resolved_at = now
            logger.info(f"Auto-resolved dataflow incident {incident.type} for dataflow {dataflow.name}")

    db.commit()


def check_dataflow_failed(db: Session, dataflow: Dataflow) -> list[Incident]:
    if dataflow.refresh_status != DataflowStatus.failed:
        return []

    if _active_dataflow_incident_exists(db, dataflow.id, "dataflow_failed"):
        return []

    last_failed = db.query(DataflowRun).filter(
        DataflowRun.dataflow_id == dataflow.id,
        DataflowRun.status == DataflowRunStatus.Failed,
    ).order_by(DataflowRun.ended_at.desc()).first()

    error_code = last_failed.error_code if last_failed else None
    error_message = last_failed.error_message if last_failed else None

    # Identify failed entity (step) for root cause hint
    failed_entity = None
    if last_failed and last_failed.entities:
        for entity in last_failed.entities:
            if (entity.get("status") or "").lower() in ("failed", "error"):
                failed_entity = entity.get("name")
                break

    if failed_entity:
        hint = f"Entity '{failed_entity}' failed in the dataflow. Check its query or datasource."
    elif error_code:
        hint = error_code
    else:
        hint = "Dataflow refresh failed. Check the dataflow entity details for the failing step."

    logger.warning(f"Dataflow mislukt: {dataflow.name} — {error_code or 'unknown error'}")
    return [Incident(
        id=str(uuid.uuid4()),
        dataflow_id=dataflow.id,
        type="dataflow_failed",
        severity=IncidentSeverity.critical,
        root_cause_hint=hint,
        detail=error_message,
    )]


def check_dataflow_delayed(db: Session, dataflow: Dataflow) -> list[Incident]:
    if not dataflow.last_refresh_at:
        return []

    now = datetime.datetime.utcnow()
    last = dataflow.last_refresh_at.replace(tzinfo=None) if dataflow.last_refresh_at.tzinfo else dataflow.last_refresh_at
    hours_since = (now - last).total_seconds() / 3600

    if hours_since < DATAFLOW_DELAY_HOURS:
        return []

    if _active_dataflow_incident_exists(db, dataflow.id, "dataflow_delayed"):
        return []

    logger.warning(f"Dataflow vertraagd: {dataflow.name} ({hours_since:.0f} uur geleden)")
    return [Incident(
        id=str(uuid.uuid4()),
        dataflow_id=dataflow.id,
        type="dataflow_delayed",
        severity=IncidentSeverity.warning,
        root_cause_hint=f"Dataflow has not refreshed for {hours_since:.0f} hours.",
        detail=f"Last refresh: {dataflow.last_refresh_at.isoformat()}",
    )]
