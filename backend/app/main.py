import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from app.api.routes import workspaces, datasets, incidents, reports, runs, environment, admin, auth
from app.core.config import settings

app = FastAPI(title="Dashboard Reliability API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspaces.router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["incidents"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(environment.router, prefix="/api/environment", tags=["environment"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.get("/health")
def health():
    from app.core.database import SessionLocal
    from app.models.dataset import Dataset
    db_status = "connected"
    scheduler_last_run = None
    scheduler_late = False

    try:
        db = SessionLocal()
        latest = db.query(func.max(Dataset.synced_at)).scalar()
        db.close()
        if latest:
            scheduler_last_run = latest.strftime("%Y-%m-%dT%H:%M:%SZ")
            age_minutes = (datetime.datetime.utcnow() - latest).total_seconds() / 60
            scheduler_late = age_minutes > 15  # alert if no sync in 15+ minutes
    except Exception:
        db_status = "error"

    status = "ok" if db_status == "connected" and not scheduler_late else "degraded"
    return {
        "status": status,
        "db": db_status,
        "scheduler_last_run": scheduler_last_run,
        "scheduler_late": scheduler_late,
    }
