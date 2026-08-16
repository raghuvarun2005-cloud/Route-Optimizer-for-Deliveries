from fastapi import APIRouter, Query
from backend.app.services.weather_service import WeatherService

router = APIRouter(prefix="/api/weather", tags=["Weather"])
weather_service = WeatherService()

@router.get("")
def get_weather_information(
    lat: float = Query(12.9716, description="Latitude"),
    lng: float = Query(77.5946, description="Longitude")
):
    """Retrieve current weather conditions and route impact factor."""
    return weather_service.get_weather(lat, lng)
