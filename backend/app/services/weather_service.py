import os
import requests
from typing import Dict, Any

class WeatherService:
    """
    Service for retrieving real-time weather information and computing route impact factors.
    Separated cleanly from route optimization logic.
    """

    def __init__(self):
        self.api_key = os.getenv("WEATHER_API_KEY", None)

    def get_weather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Retrieves weather condition for coordinates.
        Returns weather metrics and calculated route cost impact factor (0.0 to 1.0).
        """
        if self.api_key:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={self.api_key}&units=metric"
                resp = requests.get(url, timeout=3.0)
                if resp.status_code == 200:
                    data = resp.json()
                    temp = data.get("main", {}).get("temp", 22.0)
                    condition = data.get("weather", [{}])[0].get("main", "Clear")
                    description = data.get("weather", [{}])[0].get("description", "clear sky")
                    wind_speed = data.get("wind", {}).get("speed", 5.0) * 3.6  # m/s to km/h
                    visibility = data.get("visibility", 10000)
                    rain_mm = data.get("rain", {}).get("1h", 0.0)

                    # Compute impact factor
                    impact = 0.0
                    if "rain" in description.lower() or condition.lower() == "rain":
                        impact += 0.3 + min(rain_mm * 0.1, 0.4)
                    elif "snow" in description.lower() or condition.lower() == "snow":
                        impact += 0.6
                    elif "thunderstorm" in description.lower():
                        impact += 0.8

                    if visibility < 2000:
                        impact += 0.2

                    return {
                        "latitude": latitude,
                        "longitude": longitude,
                        "temperature_c": round(temp, 1),
                        "condition": condition.capitalize(),
                        "description": description.capitalize(),
                        "rain_mm": round(rain_mm, 1),
                        "wind_kph": round(wind_speed, 1),
                        "visibility_m": int(visibility),
                        "impact_factor": round(min(impact, 1.0), 2),
                        "source": "OPENWEATHERMAP_API",
                        "status_message": f"Live weather fetched ({condition})"
                    }
                else:
                    return self._fallback_weather(latitude, longitude, f"Weather API error (status {resp.status_code})")
            except Exception as e:
                return self._fallback_weather(latitude, longitude, f"Weather API timeout: {str(e)}")

        return self._fallback_weather(latitude, longitude, "Weather API key not configured")

    def _fallback_weather(self, latitude: float, longitude: float, reason: str) -> Dict[str, Any]:
        """Safe fallback weather engine returning clear indicators."""
        return {
            "latitude": latitude,
            "longitude": longitude,
            "temperature_c": 24.0,
            "condition": "Partly Cloudy",
            "description": "Scattered clouds",
            "rain_mm": 0.0,
            "wind_kph": 12.0,
            "visibility_m": 10000,
            "impact_factor": 0.1,
            "source": "MOCK_SERVICE",
            "status_message": f"Weather data unavailable ({reason}). Using safe default conditions."
        }
