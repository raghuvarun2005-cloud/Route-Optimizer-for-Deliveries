from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app.database import get_db
from backend.app.schemas.schemas import IncidentCreate, IncidentResponse
from backend.app.services.incident_service import IncidentService
from backend.app.models.incident import Incident

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])
incident_service = IncidentService()


@router.get("", response_model=List[IncidentResponse])
def get_incidents(db: Session = Depends(get_db)):
    """Fetch all active road incidents."""
    return incident_service.get_active_incidents(db)


@router.post("", response_model=IncidentResponse)
def create_incident(req: IncidentCreate, db: Session = Depends(get_db)):
    """Create a simulated road incident (Accident, Severe Traffic, Hazard)."""
    incident = incident_service.create_incident(
        db=db,
        latitude=req.latitude,
        longitude=req.longitude,
        road_id=req.road_id or "R102",
        type_=req.type or "Accident",
        severity=req.severity or "SEVERE",
        description=req.description or "Simulated incident on route"
    )
    return incident


@router.delete("/clear/all")
def clear_all_incidents(db: Session = Depends(get_db)):
    """Clear all active incidents in the database."""
    count = incident_service.clear_all_incidents(db)
    return {"message": f"Successfully cleared {count} active incidents.", "cleared_count": count}


@router.delete("/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    """Clear a specific incident by ID."""
    success = incident_service.clear_incident(db, incident_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")
    return {"message": f"Incident {incident_id} cleared successfully."}
