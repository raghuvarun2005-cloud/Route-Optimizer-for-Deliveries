from fastapi import APIRouter, Query
from backend.app.services.traffic_service import TrafficService

router = APIRouter(prefix="/api/traffic", tags=["Traffic"])
traffic_service = TrafficService()

@router.get("")
def get_traffic_information(
    road_id: str = Query("R102", description="Road segment ID"),
    lat: float = Query(12.9716, description="Latitude"),
    lng: float = Query(77.5946, description="Longitude")
):
    """Retrieve traffic condition details for road segment."""
    return traffic_service.get_traffic_for_segment(road_id, lat, lng)
