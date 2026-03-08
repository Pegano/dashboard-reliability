from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    channel = Column(String, nullable=False)  # "slack" of "email"
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="alerts")
