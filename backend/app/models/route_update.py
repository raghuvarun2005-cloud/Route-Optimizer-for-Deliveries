from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class RouteUpdate(Base):
    __tablename__ = "route_updates"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    old_route_data = Column(Text, nullable=False)  # JSON string of previous route
    new_route_data = Column(Text, nullable=False)  # JSON string of recalculation
    reason = Column(String(255), nullable=False)  # e.g., "Accident on segment R102"
    created_at = Column(DateTime, default=datetime.utcnow)

    delivery = relationship("Delivery", back_populates="updates")
