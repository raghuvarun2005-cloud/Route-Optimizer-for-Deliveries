from typing import List, Dict, Any, Optional
import math
from sqlalchemy.orm import Session
from backend.app.models.incident import Incident

class IncidentService:
    """
    Service for creating, managing, and querying active road incidents.
    Provides spatial distance evaluation to detect if an incident affects a route segment.
    """

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance between two coordinates in kilometers."""
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def get_active_incidents(self, db: Session) -> List[Incident]:
        """Fetch all currently active incidents from database."""
        return db.query(Incident).filter(Incident.status == "ACTIVE").all()

    def create_incident(
        self,
        db: Session,
        latitude: float,
        longitude: float,
        road_id: Optional[str] = None,
        type_: str = "Accident",
        severity: str = "SEVERE",
        description: str = "Accident reported on route segment"
    ) -> Incident:
        """Create and store a new active incident."""
        incident = Incident(
            latitude=latitude,
            longitude=longitude,
            road_id=road_id,
            type=type_,
            severity=severity,
            status="ACTIVE",
            description=description
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return incident

    def clear_incident(self, db: Session, incident_id: int) -> bool:
        """Mark an incident as CLEARED."""
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if incident:
            incident.status = "CLEARED"
            db.commit()
            return True
        return False

    def clear_all_incidents(self, db: Session) -> int:
        """Clear all active incidents in DB."""
        count = db.query(Incident).filter(Incident.status == "ACTIVE").update({"status": "CLEARED"})
        db.commit()
        return count

    def get_incident_severity_for_segment(
        self,
        db: Session,
        road_id: str,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        threshold_km: float = 0.5
    ) -> Optional[str]:
        """
        Determines the highest incident severity affecting a route segment.
        Checks both explicit road_id match and spatial proximity (within threshold_km).
        """
        active_incidents = self.get_active_incidents(db)
        highest_severity = None
        severity_rank = {"LOW": 1, "MODERATE": 2, "HIGH": 3, "SEVERE": 4}

        for inc in active_incidents:
            is_affected = False

            # Check road_id match
            if inc.road_id and inc.road_id == road_id:
                is_affected = True
            else:
                # Check spatial distance to segment midpoint or endpoints
                mid_lat = (start_lat + end_lat) / 2.0
                mid_lng = (start_lng + end_lng) / 2.0
                dist_mid = self.haversine_distance(inc.latitude, inc.longitude, mid_lat, mid_lng)
                dist_start = self.haversine_distance(inc.latitude, inc.longitude, start_lat, start_lng)
                dist_end = self.haversine_distance(inc.latitude, inc.longitude, end_lat, end_lng)

                if min(dist_mid, dist_start, dist_end) <= threshold_km:
                    is_affected = True

            if is_affected:
                curr_rank = severity_rank.get(inc.severity, 1)
                high_rank = severity_rank.get(highest_severity, 0)
                if curr_rank > high_rank:
                    highest_severity = inc.severity

        return highest_severity
