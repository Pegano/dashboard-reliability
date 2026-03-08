from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime


class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id = Column(String, primary_key=True)  # "{dataset_id}/{table}/{column}"
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    table_name = Column(String, nullable=False)
    column_name = Column(String, nullable=False)
    data_type = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)  # False = kolom verdwenen
    first_seen_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="schema_columns")
