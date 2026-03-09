from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True)  # Power BI report id
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=True)
    name = Column(String, nullable=False)
    web_url = Column(String, nullable=True)
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)

    workspace = relationship("Workspace", back_populates="reports")
