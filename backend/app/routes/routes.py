from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.schemas import RouteCalculateRequest, RerouteRequest
from backend.app.services.routing_service import RoutingService
from backend.app.models.route import RouteModel
import json

router = APIRouter(prefix="/api/routes", tags=["Routes"])
routing_service = RoutingService()


@router.post("/calculate")
def calculate_route(req: RouteCalculateRequest, db: Session = Depends(get_db)):
    """Calculate the optimal delivery route between source and destination using Dijkstra's algorithm."""
    try:
        stops = [(st.latitude, st.longitude) for st in req.stops] if req.stops else []
        result = routing_service.calculate_route(
            db=db,
            src_lat=req.source.latitude,
            src_lng=req.source.longitude,
            dest_lat=req.destination.latitude,
            dest_lng=req.destination.longitude,
            stops=stops
        )
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("error", "Route calculation failed."))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{route_id}")
def get_route_by_id(route_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a saved route by ID."""
    route = db.query(RouteModel).filter(RouteModel.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail=f"Route with ID {route_id} not found.")

    return {
        "id": route.id,
        "delivery_id": route.delivery_id,
        "total_distance_km": route.total_distance,
        "estimated_time_mins": route.estimated_time,
        "total_cost": route.total_cost,
        "algorithm_used": route.algorithm_used,
        "polyline": json.loads(route.path_data) if route.path_data else [],
        "created_at": route.created_at
    }


@router.post("/{route_id}/reroute")
def reroute_active_delivery(route_id: int, req: RerouteRequest, db: Session = Depends(get_db)):
    """
    DYNAMIC REROUTING ENDPOINT:
    Recalculates route starting FROM THE CURRENT POSITION of the delivery vehicle.
    """
    try:
        # Fetch destination from request or lookup route
        dest_lat = req.destination.latitude if req.destination else 12.9352
        dest_lng = req.destination.longitude if req.destination else 77.6245

        route = db.query(RouteModel).filter(RouteModel.id == route_id).first()
        delivery_id = route.delivery_id if route else req.delivery_id

        result = routing_service.reroute_from_current_location(
            db=db,
            curr_lat=req.current_location.latitude,
            curr_lng=req.current_location.longitude,
            dest_lat=dest_lat,
            dest_lng=dest_lng,
            delivery_id=delivery_id,
            affected_road_id=req.affected_road_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
