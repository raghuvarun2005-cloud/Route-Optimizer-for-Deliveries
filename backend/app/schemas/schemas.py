from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Coordinates
class LatLng(BaseModel):
    latitude: float = Field(..., description="Latitude of coordinate")
    longitude: float = Field(..., description="Longitude of coordinate")

# Route Request
class RouteCalculateRequest(BaseModel):
    source: LatLng
    destination: LatLng
    stops: Optional[List[LatLng]] = []
    source_name: Optional[str] = "Source"
    destination_name: Optional[str] = "Destination"
    vehicle_type: Optional[str] = "Delivery Van"
    avoid_traffic: Optional[bool] = True

class RerouteRequest(BaseModel):
    current_location: LatLng
    destination: Optional[LatLng] = None
    delivery_id: Optional[int] = None
    affected_road_id: Optional[str] = None

# Incident Schemas
class IncidentCreate(BaseModel):
    latitude: float
    longitude: float
    road_id: Optional[str] = None
    type: Optional[str] = "Accident"
    severity: Optional[str] = "SEVERE"  # LOW, MODERATE, HIGH, SEVERE
    description: Optional[str] = "Accident reported on route segment"

class IncidentResponse(IncidentCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Weather Schemas
class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    temperature_c: float
    condition: str
    rain_mm: float
    wind_kph: float
    visibility_m: int
    impact_factor: float
    status_message: str

# Traffic Schemas
class TrafficResponse(BaseModel):
    segment_id: str
    congestion_level: str  # LOW, MODERATE, HIGH, SEVERE
    speed_multiplier: float
    delay_minutes: float
    status_message: str

# Route Node & Polyline
class RouteNode(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    step_instruction: Optional[str] = None

class RouteResponse(BaseModel):
    id: Optional[int] = None
    delivery_id: Optional[int] = None
    source: LatLng
    destination: LatLng
    waypoints: List[LatLng]
    path: List[RouteNode]
    polyline: List[List[float]]  # Array of [lat, lng]
    total_distance_km: float
    estimated_time_mins: float
    total_cost: float
    algorithm_used: str = "Dijkstra"
    conditions: Dict[str, Any]
    incident_affected: bool = False
    rerouted_from: Optional[LatLng] = None

# Delivery Schemas
class DeliveryCreate(BaseModel):
    source_location: str
    destination_location: str
    source_lat: float
    source_lng: float
    dest_lat: float
    dest_lng: float

class DeliveryResponse(BaseModel):
    id: int
    source_location: str
    destination_location: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
