from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.refresh_run import RefreshRun, RunStatus
from app.models.dataset import Dataset

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
        # Zoek Orderoverzicht dataset in acc workspace
        ds = db.query(Dataset).join(Dataset.workspace).filter(
            Dataset.name == "Orderoverzicht"
        ).first()
        if not ds:
            return {"last_run": None}

        run = db.query(RefreshRun).filter(
            RefreshRun.dataset_id == ds.id
        ).order_by(RefreshRun.ended_at.desc()).first()

        if not run:
            return {"last_run": None}

        return {
            "last_run": {
                "ended_at": run.ended_at.strftime("%Y-%m-%dT%H:%M:%SZ") if run.ended_at else None,
                "started_at": run.started_at.strftime("%Y-%m-%dT%H:%M:%SZ") if run.started_at else None,
                "status": run.status.value if run.status else None,
                "error_code": run.error_code,
            }
        }
    finally:
        db.close()
