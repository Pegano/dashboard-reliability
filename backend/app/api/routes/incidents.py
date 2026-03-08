from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.incident import Incident, IncidentStatus

router = APIRouter()


@router.get("/")
def list_incidents(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == IncidentStatus[status])
    return query.order_by(Incident.detected_at.desc()).all()


@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident niet gevonden")
    return incident


@router.post("/{incident_id}/resolve")
def resolve_incident(incident_id: str, db: Session = Depends(get_db)):
    import datetime
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident niet gevonden")

    incident.status = IncidentStatus.resolved
    incident.resolved_at = datetime.datetime.utcnow()
    db.commit()
    return {"status": "resolved"}
