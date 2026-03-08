from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime
import enum


class RefreshStatus(enum.Enum):
    completed = "completed"
    failed = "failed"
    unknown = "unknown"


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)  # Power BI dataset id
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    name = Column(String, nullable=False)
    last_refresh_at = Column(DateTime, nullable=True)
    refresh_status = Column(Enum(RefreshStatus), default=RefreshStatus.unknown)
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)

    workspace = relationship("Workspace", back_populates="datasets")
    schema_columns = relationship("DatasetColumn", back_populates="dataset")
    incidents = relationship("Incident", back_populates="dataset")
