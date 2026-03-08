from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True)  # Power BI workspace id
    name = Column(String, nullable=False)
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)

    datasets = relationship("Dataset", back_populates="workspace")
    reports = relationship("Report", back_populates="workspace")
