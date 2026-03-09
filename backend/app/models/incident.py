from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime
import enum


class IncidentStatus(enum.Enum):
    active = "active"
    resolved = "resolved"
    suppressed = "suppressed"


class IncidentSeverity(enum.Enum):
    warning = "warning"
    critical = "critical"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.active)
    severity = Column(Enum(IncidentSeverity), default=IncidentSeverity.warning)
    type = Column(String, nullable=False)  # "refresh_failed", "refresh_delayed", "schema_change"
    root_cause_hint = Column(Text, nullable=True)
    detail = Column(Text, nullable=True)
    suppressed_until = Column(DateTime, nullable=True)

    dataset = relationship("Dataset", back_populates="incidents")
    alerts = relationship("Alert", back_populates="incident")
