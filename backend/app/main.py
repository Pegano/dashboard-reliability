from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import workspaces, datasets, incidents, reports, runs, environment

app = FastAPI(title="Dashboard Reliability API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspaces.router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["incidents"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(environment.router, prefix="/api/environment", tags=["environment"])


@app.get("/health")
def health():
    return {"status": "ok"}
