import datetime
from fastapi import APIRouter, Depends, HTTPException, Cookie
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_tenant
from app.models.dataset import Dataset as DatasetModel
from app.models.incident import Incident, IncidentStatus
from app.models.report import Report

router = APIRouter()


@router.get("/")
def list_incidents(status: str | None = None, session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    tenant = get_current_tenant(db, session)
    query = db.query(Incident).join(DatasetModel, Incident.dataset_id == DatasetModel.id).filter(
        DatasetModel.tenant_id == tenant.id
    )
    if status:
        try:
            query = query.filter(Incident.status == IncidentStatus[status])
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Unknown status: {status}")
    else:
        # By default exclude suppressed from the active view — return all non-suppressed
        # Callers that want suppressed pass status=suppressed explicitly
        pass
    # Auto-unsuppress: if suppressed_until has passed, treat as active again
    now = datetime.datetime.utcnow()
    results = query.order_by(Incident.detected_at.desc()).all()
    for incident in results:
        if incident.status == IncidentStatus.suppressed and incident.suppressed_until and incident.suppressed_until < now:
            incident.status = IncidentStatus.active
            incident.suppressed_until = None
            db.commit()

    # Build report count per dataset_id
    report_counts_q = db.query(Report.dataset_id, func.count(Report.id)).group_by(Report.dataset_id).all()
    report_counts: dict[str, int] = {row[0]: row[1] for row in report_counts_q}

    return [
        {
            "id": inc.id,
            "dataset_id": inc.dataset_id,
            "detected_at": inc.detected_at.isoformat() if inc.detected_at else None,
            "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
            "suppressed_until": inc.suppressed_until.isoformat() if inc.suppressed_until else None,
            "status": inc.status.value,
            "severity": inc.severity.value,
            "type": inc.type,
            "root_cause_hint": inc.root_cause_hint,
            "detail": inc.detail,
            "affected_reports": report_counts.get(inc.dataset_id, 0),
        }
        for inc in results
    ]


@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident niet gevonden")
    return incident


@router.post("/{incident_id}/resolve")
def resolve_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident niet gevonden")
    incident.status = IncidentStatus.resolved
    incident.resolved_at = datetime.datetime.utcnow()
    db.commit()
    return {"status": "resolved"}


class SuppressRequest(BaseModel):
    hours: int = 24


@router.post("/{incident_id}/suppress")
def suppress_incident(incident_id: str, body: SuppressRequest, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident niet gevonden")
    incident.status = IncidentStatus.suppressed
    incident.suppressed_until = datetime.datetime.utcnow() + datetime.timedelta(hours=body.hours)
    db.commit()
    return {"status": "suppressed", "until": incident.suppressed_until.isoformat()}
