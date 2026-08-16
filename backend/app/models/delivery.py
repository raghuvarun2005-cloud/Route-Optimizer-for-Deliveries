from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    source_location = Column(String(255), nullable=False)
    destination_location = Column(String(255), nullable=False)
    source_lat = Column(Float, nullable=True)
    source_lng = Column(Float, nullable=True)
    dest_lat = Column(Float, nullable=True)
    dest_lng = Column(Float, nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, IN_TRANSIT, REROUTED, DELIVERED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)

    routes = relationship("RouteModel", back_populates="delivery")
    updates = relationship("RouteUpdate", back_populates="delivery")
