"""
Seed script — vult de database met realistische testdata.
Meerdere datasets, workspace, runs (refresh history), en incidents.

Gebruik:
    python seed.py         — vult aan (maakt niets leeg)
    python seed.py --reset — wist alles en herseeds
"""

import sys
import datetime
import random
import uuid
from app.core.database import SessionLocal
from app.models import Workspace, Dataset, DatasetColumn, Incident, Alert
from app.models.dataset import RefreshStatus
from app.models.incident import IncidentStatus, IncidentSeverity
from app.models.refresh_run import RefreshRun, RunStatus

NOW = datetime.datetime.utcnow()
random.seed(42)  # reproducible


def dt(hours_ago=0, days_ago=0, minutes_ago=0):
    return NOW - datetime.timedelta(hours=hours_ago, days=days_ago, minutes=minutes_ago)


WORKSPACE_ID = "seed-workspace-0001"

DATASETS = [
    {
        "id": "seed-ds-sales-001",
        "name": "Sales rapportage",
        "refresh_status": RefreshStatus.failed,
        "last_refresh_at": dt(hours_ago=3),
        "synced_at": dt(hours_ago=0),
        "columns": [
            ("Verkoop", "Datum", "DateTime"),
            ("Verkoop", "Omzet", "Decimal"),
            ("Verkoop", "Regio", "Text"),
            ("Verkoop", "Verkoper", "Text"),
        ],
        # Mostly healthy, recently started failing
        "run_pattern": "mostly_good_recent_fail",
        "incidents": [
            {
                "type": "refresh_failed",
                "severity": IncidentSeverity.critical,
                "root_cause_hint": "Dataset refresh failed. Check the Power BI refresh settings and the data source.",
                "detail": "Error occurred while fetching data from SQL Server. Timeout after 30 seconds.",
                "detected_at": dt(hours_ago=3),
            }
        ],
    },
    {
        "id": "seed-ds-finance-001",
        "name": "Finance dashboard",
        "refresh_status": RefreshStatus.completed,
        "last_refresh_at": dt(hours_ago=28),
        "synced_at": dt(hours_ago=0),
        "columns": [
            ("Finance", "Datum", "DateTime"),
            ("Finance", "Kosten", "Decimal"),
            ("Finance", "Begroting", "Decimal"),
            ("Finance", "Afdeling", "Text"),
        ],
        # Reliable but slow — occasional delays
        "run_pattern": "reliable_slow",
        "incidents": [
            {
                "type": "refresh_delayed",
                "severity": IncidentSeverity.warning,
                "root_cause_hint": "Dataset has not been refreshed for more than 24 hours. The scheduled refresh may have stopped.",
                "detail": "Last successful refresh: 28 hours ago.",
                "detected_at": dt(hours_ago=4),
            }
        ],
    },
    {
        "id": "seed-ds-hr-001",
        "name": "HR overzicht",
        "refresh_status": RefreshStatus.completed,
        "last_refresh_at": dt(hours_ago=1),
        "synced_at": dt(hours_ago=0),
        "columns": [
            ("HR", "Medewerker", "Text"),
            ("HR", "Afdeling", "Text"),
            ("HR", "Startdatum", "DateTime"),
            ("HR", "FTE", "Decimal"),
        ],
        # Very reliable, fast
        "run_pattern": "very_reliable",
        "incidents": [
            {
                "type": "schema_change",
                "severity": IncidentSeverity.warning,
                "root_cause_hint": "Columns removed from dataset. Reports using these columns may be incorrect.",
                "detail": "Removed column: HR.Salaris (Decimal). Present in previous sync, now missing.",
                "detected_at": dt(hours_ago=2),
            }
        ],
    },
    {
        "id": "seed-ds-marketing-001",
        "name": "Marketing KPIs",
        "refresh_status": RefreshStatus.completed,
        "last_refresh_at": dt(hours_ago=2),
        "synced_at": dt(hours_ago=0),
        "columns": [
            ("Campagne", "Naam", "Text"),
            ("Campagne", "Clicks", "Int64"),
            ("Campagne", "Conversies", "Int64"),
            ("Campagne", "Budget", "Decimal"),
        ],
        # Flaky — frequent failures, recovering
        "run_pattern": "flaky",
        "incidents": [],
    },
    {
        "id": "seed-ds-ops-001",
        "name": "Operations dashboard",
        "refresh_status": RefreshStatus.failed,
        "last_refresh_at": dt(hours_ago=6),
        "synced_at": dt(hours_ago=0),
        "columns": [
            ("Ops", "Ticket", "Text"),
            ("Ops", "Status", "Text"),
            ("Ops", "Prioriteit", "Text"),
            ("Ops", "Doorlooptijd", "Decimal"),
        ],
        # Degraded for days — repeated failures
        "run_pattern": "degraded",
        "incidents": [
            {
                "type": "refresh_failed",
                "severity": IncidentSeverity.critical,
                "root_cause_hint": "Dataset refresh failed. Check the Power BI refresh settings and the data source.",
                "detail": "Credentials for ServiceNow API have expired. Renew the data source connection.",
                "detected_at": dt(hours_ago=6),
            },
            {
                "type": "refresh_delayed",
                "severity": IncidentSeverity.warning,
                "root_cause_hint": "Dataset has not been successfully refreshed for more than 24 hours.",
                "detail": "Refresh failed for 6 hours. Last successful refresh: 2 days ago.",
                "detected_at": dt(hours_ago=48),
                "status": IncidentStatus.resolved,
                "resolved_at": dt(hours_ago=6),
            },
        ],
    },
]


def make_runs(dataset_id: str, pattern: str) -> list[RefreshRun]:
    """Generate 30 days of realistic run history based on a pattern."""
    runs = []
    # Refresh twice daily, offset by dataset for variety
    offsets = {"seed-ds-sales-001": 0, "seed-ds-finance-001": 3, "seed-ds-hr-001": 1,
                "seed-ds-marketing-001": 5, "seed-ds-ops-001": 7}
    start_offset = offsets.get(dataset_id, 0)

    for day in range(30, -1, -1):
        for run_num in range(2):  # 2 runs per day
            hour = 6 + run_num * 12 + start_offset
            started = dt(days_ago=day, hours_ago=0) - datetime.timedelta(hours=24 - hour)

            if pattern == "mostly_good_recent_fail":
                # Healthy for 28 days, then failing
                if day <= 2:
                    status = RunStatus.failed
                    duration = random.randint(180, 400)
                    error_code = "DataSourceError"
                    error_desc = "SQL Server connection timeout after 30s"
                else:
                    status = RunStatus.completed
                    duration = random.randint(90, 180)
                    error_code = None
                    error_desc = None

            elif pattern == "reliable_slow":
                # Always succeeds but takes long
                status = RunStatus.completed
                duration = random.randint(600, 1200)
                error_code = None
                error_desc = None

            elif pattern == "very_reliable":
                # Fast and always green
                status = RunStatus.completed
                duration = random.randint(30, 90)
                error_code = None
                error_desc = None

            elif pattern == "flaky":
                # ~30% failure rate, random
                if random.random() < 0.30:
                    status = RunStatus.failed
                    duration = random.randint(60, 300)
                    error_code = random.choice(["GatewayTimeout", "CredentialsExpired", "QueryTimeout"])
                    error_desc = "Transient connection error. Retry scheduled."
                else:
                    status = RunStatus.completed
                    duration = random.randint(120, 360)
                    error_code = None
                    error_desc = None

            elif pattern == "degraded":
                # Worked fine until 5 days ago, then mostly failing
                if day > 5:
                    status = RunStatus.completed
                    duration = random.randint(200, 500)
                    error_code = None
                    error_desc = None
                else:
                    if random.random() < 0.85:
                        status = RunStatus.failed
                        duration = random.randint(10, 60)
                        error_code = "CredentialsExpired"
                        error_desc = "ServiceNow API credentials have expired."
                    else:
                        status = RunStatus.completed
                        duration = random.randint(200, 500)
                        error_code = None
                        error_desc = None
            else:
                status = RunStatus.completed
                duration = 120
                error_code = None
                error_desc = None

            ended = started + datetime.timedelta(seconds=duration)
            run_id = f"seed-run-{dataset_id[-8:]}-{day}-{run_num}"

            runs.append(RefreshRun(
                id=run_id,
                dataset_id=dataset_id,
                status=status,
                started_at=started,
                ended_at=ended,
                error_code=error_code,
                error_description=error_desc,
            ))

    return runs


def seed(db):
    # Workspace
    ws = db.get(Workspace, WORKSPACE_ID)
    if not ws:
        ws = Workspace(id=WORKSPACE_ID, name="WNK Data (demo)", synced_at=NOW)
        db.add(ws)

    for ds_def in DATASETS:
        ds = db.get(Dataset, ds_def["id"])
        if not ds:
            ds = Dataset(
                id=ds_def["id"],
                workspace_id=WORKSPACE_ID,
                name=ds_def["name"],
                refresh_status=ds_def["refresh_status"],
                last_refresh_at=ds_def["last_refresh_at"],
                synced_at=ds_def["synced_at"],
            )
            db.add(ds)
        else:
            ds.refresh_status = ds_def["refresh_status"]
            ds.last_refresh_at = ds_def["last_refresh_at"]
            ds.synced_at = ds_def["synced_at"]

        # Kolommen
        for table, col, dtype in ds_def["columns"]:
            col_id = f"{ds_def['id']}/{table}/{col}"
            if not db.get(DatasetColumn, col_id):
                db.add(DatasetColumn(
                    id=col_id,
                    dataset_id=ds_def["id"],
                    table_name=table,
                    column_name=col,
                    data_type=dtype,
                    is_active=True,
                ))

        db.flush()  # ensure dataset exists before adding runs (FK constraint)

        # Run history
        existing_run = db.query(RefreshRun).filter(
            RefreshRun.dataset_id == ds_def["id"],
            RefreshRun.id.like("seed-run-%")
        ).first()
        if not existing_run:
            runs = make_runs(ds_def["id"], ds_def["run_pattern"])
            for run in runs:
                db.add(run)
            print(f"  {ds_def['name']:30s} — {len(runs)} runs toegevoegd ({ds_def['run_pattern']})")

        # Incidents
        for inc_def in ds_def["incidents"]:
            existing = db.query(Incident).filter(
                Incident.dataset_id == ds_def["id"],
                Incident.type == inc_def["type"],
                Incident.status == inc_def.get("status", IncidentStatus.active),
            ).first()
            if not existing:
                db.add(Incident(
                    id=str(uuid.uuid4()),
                    dataset_id=ds_def["id"],
                    type=inc_def["type"],
                    severity=inc_def["severity"],
                    status=inc_def.get("status", IncidentStatus.active),
                    root_cause_hint=inc_def["root_cause_hint"],
                    detail=inc_def.get("detail"),
                    detected_at=inc_def["detected_at"],
                    resolved_at=inc_def.get("resolved_at"),
                ))

    db.commit()
    print(f"\nSeed voltooid: {len(DATASETS)} datasets, workspace 'WNK Data (demo)'")


def reset(db):
    print("Reset: verwijder seed data...")
    ds_ids = [d["id"] for d in DATASETS]
    db.query(Alert).filter(Alert.incident_id.in_(
        db.query(Incident.id).filter(Incident.dataset_id.in_(ds_ids))
    )).delete(synchronize_session=False)
    db.query(Incident).filter(Incident.dataset_id.in_(ds_ids)).delete(synchronize_session=False)
    db.query(RefreshRun).filter(RefreshRun.dataset_id.in_(ds_ids)).delete(synchronize_session=False)
    db.query(DatasetColumn).filter(DatasetColumn.dataset_id.in_(ds_ids)).delete(synchronize_session=False)
    db.query(Dataset).filter(Dataset.id.in_(ds_ids)).delete(synchronize_session=False)
    db.query(Workspace).filter(Workspace.id == WORKSPACE_ID).delete(synchronize_session=False)
    db.commit()
    print("Reset klaar.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        if "--reset" in sys.argv:
            reset(db)
        seed(db)
    finally:
        db.close()
