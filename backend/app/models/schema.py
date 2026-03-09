from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, BigInteger
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
    cardinality = Column(BigInteger, nullable=True)  # aantal unieke waarden
    is_active = Column(Boolean, default=True)  # False = kolom verdwenen
    first_seen_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="schema_columns")


class DatasetSnapshot(Base):
    """Lichtgewicht volumesnapshot per sync — basis voor groeidetectie en duurtrend."""
    __tablename__ = "dataset_snapshots"

    id = Column(String, primary_key=True)  # "{dataset_id}_{synced_at_iso}"
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)
    row_count_estimate = Column(BigInteger, nullable=True)  # som van cardinalities
    duration_ms = Column(BigInteger, nullable=True)         # duur laatste succesvolle run in ms
