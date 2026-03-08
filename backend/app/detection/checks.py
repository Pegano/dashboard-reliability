"""
Detectie engine — Layer 1 checks.
Draait na elke sync cyclus.
"""

import datetime
import logging
import uuid
from sqlalchemy.orm import Session
from app.models.dataset import Dataset, RefreshStatus
from app.models.schema import DatasetColumn
from app.models.incident import Incident, IncidentStatus, IncidentSeverity

logger = logging.getLogger(__name__)

REFRESH_DELAY_HOURS = 24  # incident als dataset langer dan X uur niet gerefresht is


def run_all_checks(db: Session) -> list[Incident]:
    incidents = []
    datasets = db.query(Dataset).all()

    for dataset in datasets:
        incidents += check_refresh_failed(db, dataset)
        incidents += check_refresh_delayed(db, dataset)
        incidents += check_schema_changes(db, dataset)

    if incidents:
        db.add_all(incidents)
        db.commit()
        logger.info(f"{len(incidents)} nieuwe incident(en) aangemaakt")

    return incidents


def check_refresh_failed(db: Session, dataset: Dataset) -> list[Incident]:
    if dataset.refresh_status != RefreshStatus.failed:
        return []

    if _active_incident_exists(db, dataset.id, "refresh_failed"):
        return []

    logger.warning(f"Refresh mislukt: {dataset.name}")
    return [Incident(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        type="refresh_failed",
        severity=IncidentSeverity.critical,
        root_cause_hint="Dataset refresh mislukt. Controleer de Power BI refresh instellingen en de databron.",
        detail=f"Dataset '{dataset.name}' heeft een mislukte refresh.",
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
        root_cause_hint=f"Dataset is al {hours_since_refresh:.0f} uur niet gerefresht. Controleer de refresh schedule.",
        detail=f"Laatste succesvolle refresh: {dataset.last_refresh_at.isoformat()}",
    )]


def check_schema_changes(db: Session, dataset: Dataset) -> list[Incident]:
    changed_columns = db.query(DatasetColumn).filter(
        DatasetColumn.dataset_id == dataset.id,
        DatasetColumn.is_active == False,
    ).all()

    if not changed_columns:
        return []

    if _active_incident_exists(db, dataset.id, "schema_change"):
        return []

    col_names = ", ".join(f"{c.table_name}.{c.column_name}" for c in changed_columns)
    logger.warning(f"Schema change: {dataset.name} — verdwenen kolommen: {col_names}")

    return [Incident(
        id=str(uuid.uuid4()),
        dataset_id=dataset.id,
        type="schema_change",
        severity=IncidentSeverity.critical,
        root_cause_hint=f"Kolommen verdwenen uit dataset. Rapporten die deze kolommen gebruiken kunnen incorrect zijn.",
        detail=f"Verdwenen kolommen: {col_names}",
    )]


def _active_incident_exists(db: Session, dataset_id: str, incident_type: str) -> bool:
    return db.query(Incident).filter(
        Incident.dataset_id == dataset_id,
        Incident.type == incident_type,
        Incident.status == IncidentStatus.active,
    ).first() is not None
