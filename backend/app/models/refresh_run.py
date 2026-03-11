from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from app.core.database import Base
import datetime
import enum


class RunStatus(enum.Enum):
    completed = "completed"
    failed = "failed"
    unknown = "unknown"
    disabled = "disabled"
    cancelled = "cancelled"


class RefreshRun(Base):
    __tablename__ = "refresh_runs"

    id = Column(String, primary_key=True)  # Power BI requestId or generated
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    status = Column(Enum(RunStatus), default=RunStatus.unknown)
    refresh_type = Column(String, nullable=True)  # scheduled, onDemand, viaApi, viaEnhancedApi, viaXmlaEndpoint
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    error_code = Column(String, nullable=True)
    error_description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
