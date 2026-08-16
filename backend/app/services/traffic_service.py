import os
import requests
import random
from typing import Dict, Any, List

class TrafficService:
    """
    Service for obtaining road traffic conditions.
    Supports live traffic API integration with graceful mock fallback.
    """

    def __init__(self):
        self.api_key = os.getenv("TRAFFIC_API_KEY", None)

    def get_traffic_for_segment(self, road_id: str, start_lat: float, start_lng: float) -> Dict[str, Any]:
        """
        Retrieves traffic conditions for a given road segment or location.
        Returns congestion level, speed multiplier, and estimated delay.
        """
        if self.api_key:
            try:
                # Example API call structure for TomTom/HERE traffic API
                url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?key={self.api_key}&point={start_lat},{start_lng}"
                resp = requests.get(url, timeout=3.0)
                if resp.status_code == 200:
                    data = resp.json()
                    current_speed = data.get("flowSegmentData", {}).get("currentSpeed", 50)
                    free_flow_speed = data.get("flowSegmentData", {}).get("freeFlowSpeed", 50)
                    ratio = free_flow_speed / max(current_speed, 1.0)

                    if ratio < 1.2:
                        level = "LOW"
                    elif ratio < 1.6:
                        level = "MODERATE"
                    elif ratio < 2.5:
                        level = "HIGH"
                    else:
                        level = "SEVERE"

                    return {
                        "segment_id": road_id,
                        "congestion_level": level,
                        "speed_multiplier": round(ratio, 2),
                        "delay_minutes": round((ratio - 1.0) * 5.0, 1),
                        "source": "LIVE_API",
                        "status_message": f"Live traffic fetched ({level})"
                    }
            except Exception as e:
                # Log error silently and fall back to mock
                pass

        # Fallback Mock Traffic Service
        return self._get_mock_traffic(road_id)

    def _get_mock_traffic(self, road_id: str) -> Dict[str, Any]:
        """Deterministic mock traffic generator based on road_id hash."""
        hash_val = sum(ord(c) for c in road_id) % 10

        if hash_val in [0, 1, 2, 3, 4, 5]:
            level = "LOW"
            mult = 1.0
            delay = 0.0
        elif hash_val in [6, 7]:
            level = "MODERATE"
            mult = 1.35
            delay = 3.5
        elif hash_val == 8:
            level = "HIGH"
            mult = 1.8
            delay = 8.0
        else:
            level = "SEVERE"
            mult = 2.5
            delay = 18.0

        return {
            "segment_id": road_id,
            "congestion_level": level,
            "speed_multiplier": mult,
            "delay_minutes": delay,
            "source": "MOCK_SERVICE",
            "status_message": f"Traffic data (Mock Service: {level})" if not self.api_key else "Traffic API temporarily unavailable (using safe fallback)"
        }

    def get_all_traffic_conditions(self, road_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch traffic conditions for multiple road segments."""
        results = {}
        for rid in road_ids:
            results[rid] = self.get_traffic_for_segment(rid, 0.0, 0.0)
        return results
