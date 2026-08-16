from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class RouteModel(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    total_distance = Column(Float, nullable=False)  # in km
    estimated_time = Column(Float, nullable=False)  # in minutes
    total_cost = Column(Float, nullable=False)
    algorithm_used = Column(String(50), default="Dijkstra")
    path_data = Column(Text, nullable=False)  # JSON representation of route nodes/coordinates
    created_at = Column(DateTime, default=datetime.utcnow)

    delivery = relationship("Delivery", back_populates="routes")
