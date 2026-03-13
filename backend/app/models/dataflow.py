from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime
import enum


class DataflowStatus(enum.Enum):
    completed = "completed"
    failed = "failed"
    unknown = "unknown"


class DataflowRunStatus(enum.Enum):
    Success = "Success"
    Failed = "Failed"
    Cancelled = "Cancelled"
    InProgress = "InProgress"


class Dataflow(Base):
    __tablename__ = "dataflows"

    id = Column(String, primary_key=True)         # Power BI dataflow id
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_refresh_at = Column(DateTime, nullable=True)
    refresh_status = Column(Enum(DataflowStatus), default=DataflowStatus.unknown)

    workspace = relationship("Workspace", back_populates="dataflows")
    runs = relationship("DataflowRun", back_populates="dataflow")
    incidents = relationship("Incident", back_populates="dataflow")


class DataflowRun(Base):
    __tablename__ = "dataflow_runs"

    id = Column(String, primary_key=True)         # Power BI transactionId
    dataflow_id = Column(String, ForeignKey("dataflows.id"), nullable=False)
    status = Column(Enum(DataflowRunStatus), default=DataflowRunStatus.InProgress)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    error_code = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    # List of {entityName, status, startTime, endTime, error} — populated from transaction detail API
    entities = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataflow = relationship("Dataflow", back_populates="runs")
