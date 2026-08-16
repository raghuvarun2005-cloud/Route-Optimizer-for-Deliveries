from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app.database import get_db
from backend.app.schemas.schemas import DeliveryCreate, DeliveryResponse
from backend.app.models.delivery import Delivery

router = APIRouter(prefix="/api/deliveries", tags=["Deliveries"])

@router.get("", response_model=List[DeliveryResponse])
def get_deliveries(db: Session = Depends(get_db)):
    """Fetch all delivery records."""
    return db.query(Delivery).order_by(Delivery.id.desc()).all()

@router.post("", response_model=DeliveryResponse)
def create_delivery(req: DeliveryCreate, db: Session = Depends(get_db)):
    """Create a new delivery record."""
    delivery = Delivery(
        source_location=req.source_location,
        destination_location=req.destination_location,
        source_lat=req.source_lat,
        source_lng=req.source_lng,
        dest_lat=req.dest_lat,
        dest_lng=req.dest_lng,
        status="PENDING"
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return delivery
