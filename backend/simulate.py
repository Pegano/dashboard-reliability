"""
Simulatie script — injecteert test scenarios direct in de database.
Gebruik dit om de detectie engine te testen zonder live Power BI connectie.

Gebruik:
    python simulate.py reset          — reset naar schone staat
    python simulate.py refresh_failed — simuleer mislukte refresh
    python simulate.py refresh_delayed — simuleer verouderde dataset
    python simulate.py schema_change  — simuleer verdwenen kolom
    python simulate.py all            — draai alle scenarios na elkaar
"""

import sys
import datetime
import uuid
from app.core.database import SessionLocal
from app.models import Workspace, Dataset, DatasetColumn, Incident, Alert
from app.models.dataset import RefreshStatus
from app.models.incident import IncidentStatus

WORKSPACE_ID = "6d01cd95-9767-4b56-a544-d3d3c237f563"
DATASET_ID = "fa6de6d1-854f-479d-b7ab-8a1f1bccc5c0"


def reset(db):
    """Reset naar schone staat — dataset healthy, geen incidents."""
    db.query(Alert).delete()
    db.query(Incident).delete()
    db.query(DatasetColumn).delete()

    dataset = db.get(Dataset, DATASET_ID)
    dataset.refresh_status = RefreshStatus.completed
    dataset.last_refresh_at = datetime.datetime.utcnow()
    db.commit()

    # Voeg standaard schema kolommen toe
    columns = [
        ("Sales", "Datum", "DateTime"),
        ("Sales", "Omzet", "Decimal"),
        ("Sales", "Orders", "Int64"),
    ]
    for table, col, dtype in columns:
        col_id = f"{DATASET_ID}/{table}/{col}"
        column = DatasetColumn(
            id=col_id,
            dataset_id=DATASET_ID,
            table_name=table,
            column_name=col,
            data_type=dtype,
            is_active=True,
        )
        db.merge(column)

    db.commit()
    print("Reset: dataset healthy, schema aanwezig, geen incidents.")


def refresh_failed(db):
    """Simuleer een mislukte dataset refresh."""
    dataset = db.get(Dataset, DATASET_ID)
    dataset.refresh_status = RefreshStatus.failed
    dataset.last_refresh_at = datetime.datetime.utcnow() - datetime.timedelta(hours=2)
    db.commit()
    print("Scenario: refresh_failed — dataset refresh status op 'failed' gezet.")


def refresh_delayed(db):
    """Simuleer een dataset die te lang niet gerefresht is."""
    dataset = db.get(Dataset, DATASET_ID)
    dataset.refresh_status = RefreshStatus.completed
    dataset.last_refresh_at = datetime.datetime.utcnow() - datetime.timedelta(hours=30)
    db.commit()
    print("Scenario: refresh_delayed — laatste refresh 30 uur geleden.")


def schema_change(db):
    """Simuleer een verdwenen kolom in het dataset schema."""
    col_id = f"{DATASET_ID}/Sales/Omzet"
    column = db.get(DatasetColumn, col_id)
    if column:
        column.is_active = False
        db.commit()
        print("Scenario: schema_change — kolom 'Sales.Omzet' gemarkeerd als verdwenen.")
    else:
        print("Kolom niet gevonden. Draai eerst 'reset'.")


def run_detection(db):
    """Draai de detectie engine en toon resultaten."""
    from app.detection.checks import run_all_checks
    print("\n--- Detectie engine draait ---")
    incidents = run_all_checks(db)
    if incidents:
        print(f"{len(incidents)} incident(en) aangemaakt:")
        for inc in incidents:
            print(f"  [{inc.severity.value.upper()}] {inc.type}")
            print(f"  Root cause: {inc.root_cause_hint}")
    else:
        print("Geen nieuwe incidents gedetecteerd.")

    # Toon alle actieve incidents
    active = db.query(Incident).filter(Incident.status == IncidentStatus.active).all()
    if active:
        print(f"\nActieve incidents in database: {len(active)}")
        for inc in active:
            print(f"  #{inc.id[:8]} [{inc.severity.value.upper()}] {inc.type} — {inc.root_cause_hint}")


SCENARIOS = {
    "reset": reset,
    "refresh_failed": refresh_failed,
    "refresh_delayed": refresh_delayed,
    "schema_change": schema_change,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in [*SCENARIOS.keys(), "all"]:
        print(__doc__)
        sys.exit(1)

    db = SessionLocal()
    try:
        cmd = sys.argv[1]
        if cmd == "all":
            for name, fn in SCENARIOS.items():
                if name == "reset":
                    continue
                print(f"\n{'='*50}")
                reset(db)
                fn(db)
                run_detection(db)
        else:
            SCENARIOS[cmd](db)
            if cmd != "reset":
                run_detection(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
