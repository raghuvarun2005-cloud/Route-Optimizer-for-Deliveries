from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from backend.app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(String(100), nullable=True)
    type = Column(String(50), default="Accident")  # Accident, Heavy Traffic, Construction, Hazard
    severity = Column(String(20), nullable=False)  # LOW, MODERATE, HIGH, SEVERE
    status = Column(String(20), default="ACTIVE")  # ACTIVE, CLEARED
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
