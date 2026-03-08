"""Maak alle database tabellen aan op basis van de SQLAlchemy modellen."""
from app.core.database import Base, engine
from app.models import workspace, dataset, report, schema, incident, alert

Base.metadata.create_all(bind=engine)
print("Tabellen aangemaakt.")
