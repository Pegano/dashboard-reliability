from fastapi import APIRouter, HTTPException
from sqlalchemy import text, func
from app.core.database import SessionLocal
from app.models.refresh_run import RefreshRun, RunStatus
from app.models.dataset import Dataset
from app.models.workspace import Workspace

import os

router = APIRouter()

PULSE_TEST_DSN = os.getenv(
    "PULSE_TEST_DSN",
    "postgresql://powerbi_reader:PulseBI2026!@localhost:5432/pulse_test"
)

ALLOWED_TABLES = {"customers", "orders", "products"}


@router.get("/pulse-test/{table_name}")
def get_table_data(table_name: str):
    if table_name not in ALLOWED_TABLES:
        raise HTTPException(status_code=400, detail=f"Unknown table: {table_name}")

    from sqlalchemy import create_engine
    engine = create_engine(
        PULSE_TEST_DSN,
        connect_args={"sslmode": "require", "sslrootcert": "disable"}
        if "sslmode" not in PULSE_TEST_DSN else {}
    )
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(f"SELECT * FROM {table_name} ORDER BY 1 LIMIT 500"))
            cols = list(rows.keys())
            data = [dict(zip(cols, row)) for row in rows]
        return {"columns": cols, "rows": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        engine.dispose()


@router.get("/last-run")
def get_last_run():
    db = SessionLocal()
    try:
        # Last Pulse sync = meest recente synced_at over alle datasets
        last_synced_at = db.query(func.max(Dataset.synced_at)).scalar()

        # Laatste PBI refresh per dataset
        datasets = db.query(Dataset, Workspace.name).join(Workspace).order_by(Workspace.name, Dataset.name).all()
        model_refreshes = []
        for ds, ws_name in datasets:
            run = db.query(RefreshRun).filter(
                RefreshRun.dataset_id == ds.id,
                RefreshRun.ended_at.isnot(None),
            ).order_by(RefreshRun.ended_at.desc()).first()
            model_refreshes.append({
                "dataset_id": ds.id,
                "name": ds.name,
                "workspace": ws_name,
                "last_refresh_at": run.ended_at.strftime("%Y-%m-%dT%H:%M:%SZ") if run and run.ended_at else None,
                "status": run.status.value if run and run.status else None,
            })

        return {
            "last_synced_at": last_synced_at.strftime("%Y-%m-%dT%H:%M:%SZ") if last_synced_at else None,
            "model_refreshes": model_refreshes,
        }
    finally:
        db.close()
