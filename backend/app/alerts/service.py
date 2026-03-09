"""
Alert service — bepaalt wanneer en via welke channels een alert verstuurd wordt.
"""

import uuid
import logging
import datetime
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.alert import Alert
from app.models.dataset import Dataset
from app.alerts.channels import send_email, send_telegram, send_webhook

logger = logging.getLogger(__name__)

DEDUP_WINDOW_HOURS = 1


def should_alert(db: Session, incident: Incident, channel: str) -> bool:
    """Controleer of er al een alert verstuurd is voor dit incident binnen het dedup venster."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=DEDUP_WINDOW_HOURS)
    existing = db.query(Alert).filter(
        Alert.incident_id == incident.id,
        Alert.channel == channel,
        Alert.sent_at >= cutoff,
    ).first()
    return existing is None


def record_alert(db: Session, incident: Incident, channel: str) -> None:
    alert = Alert(
        id=str(uuid.uuid4()),
        incident_id=incident.id,
        channel=channel,
        sent_at=datetime.datetime.utcnow(),
    )
    db.add(alert)
    db.commit()


def send_alerts_for_incident(db: Session, incident: Incident) -> None:
    dataset = db.get(Dataset, incident.dataset_id)
    dataset_name = dataset.name if dataset else incident.dataset_id

    for channel, send_fn in [("email", send_email), ("telegram", send_telegram), ("webhook", send_webhook)]:
        if should_alert(db, incident, channel):
            success = send_fn(incident, dataset_name)
            if success:
                record_alert(db, incident, channel)


def send_alerts_for_incidents(db: Session, incidents: list[Incident]) -> None:
    for incident in incidents:
        send_alerts_for_incident(db, incident)
