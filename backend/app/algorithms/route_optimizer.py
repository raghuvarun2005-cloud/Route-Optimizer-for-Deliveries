from typing import Dict, List, Any, Optional
from backend.app.algorithms.dijkstra import DijkstraOptimizer

class RouteCostCalculator:
    """
    Modular route edge cost function calculator based on multi-variable real-world factors:
    cost = distance_cost + traffic_cost + incident_cost + weather_cost
    """

    @staticmethod
    def calculate_edge_cost(
        distance_km: float,
        speed_limit_kph: float = 50.0,
        traffic_multiplier: float = 1.0,
        incident_severity: Optional[str] = None,
        weather_impact: float = 0.0,
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """
        Calculate breakdown of edge cost and total composite weight.

        incident_severity: None, 'LOW', 'MODERATE', 'HIGH', 'SEVERE'
        weather_impact: 0.0 (Clear) to 1.0 (Storm/Heavy Rain)
        """
        if weights is None:
            weights = {
                "distance_weight": 1.0,
                "traffic_weight": 2.0,
                "incident_weight": 1.0,
                "weather_weight": 1.5
            }

        # 1. Base distance cost (in km)
        distance_cost = distance_km * weights.get("distance_weight", 1.0)

        # Base estimated time (minutes)
        base_time_mins = (distance_km / max(speed_limit_kph, 5.0)) * 60.0

        # 2. Traffic cost (multiplier >= 1.0, e.g. 1.5x, 2.5x speed reduction)
        traffic_factor = max(traffic_multiplier - 1.0, 0.0)
        traffic_cost = distance_km * traffic_factor * weights.get("traffic_weight", 2.0)

        # 3. Incident cost penalty
        incident_penalties = {
            None: 0.0,
            "LOW": 2.0,
            "MODERATE": 8.0,
            "HIGH": 25.0,
            "SEVERE": 500.0  # Massive cost penalty to force rerouting around severe accidents
        }
        raw_incident_penalty = incident_penalties.get(incident_severity, 0.0)
        incident_cost = raw_incident_penalty * weights.get("incident_weight", 1.0)

        # 4. Weather cost
        weather_cost = distance_km * max(weather_impact, 0.0) * weights.get("weather_weight", 1.5)

        total_cost = distance_cost + traffic_cost + incident_cost + weather_cost

        # Adjusted time incorporating traffic delay & incident slowdown
        adjusted_time_mins = base_time_mins * traffic_multiplier
        if incident_severity == "MODERATE":
            adjusted_time_mins += 5.0
        elif incident_severity == "HIGH":
            adjusted_time_mins += 15.0
        elif incident_severity == "SEVERE":
            adjusted_time_mins += 45.0

        return {
            "total_cost": round(total_cost, 4),
            "distance_cost": round(distance_cost, 4),
            "traffic_cost": round(traffic_cost, 4),
            "incident_cost": round(incident_cost, 4),
            "weather_cost": round(weather_cost, 4),
            "distance_km": round(distance_km, 3),
            "estimated_time_mins": round(adjusted_time_mins, 2)
        }


class RouteOptimizer:
    """
    High-level Route Optimization engine wrapping graph building,
    edge weighting, Dijkstra computation, and mid-drive dynamic rerouting.
    """

    def __init__(self, node_locations: Dict[str, Dict[str, Any]], edge_connections: List[Dict[str, Any]]):
        """
        node_locations: {
            "node_1": {"name": "Warehouse A", "lat": 12.9716, "lng": 77.5946},
            ...
        }
        edge_connections: [
            {"u": "node_1", "v": "node_2", "distance_km": 3.2, "road_id": "R101", ...},
            ...
        ]
        """
        self.nodes = node_locations
        self.edges = edge_connections
        self.dijkstra = DijkstraOptimizer()

    def build_graph(
        self,
        traffic_map: Optional[Dict[str, float]] = None,
        incident_map: Optional[Dict[str, str]] = None,
        weather_impact: float = 0.0
    ):
        """Build weighted graph graph[u] = [(v, weight, metadata), ...]"""
        self.dijkstra = DijkstraOptimizer()
        traffic_map = traffic_map or {}
        incident_map = incident_map or {}

        for edge in self.edges:
            u = edge["u"]
            v = edge["v"]
            distance_km = edge.get("distance_km", 1.0)
            road_id = edge.get("road_id", f"{u}-{v}")
            speed_limit = edge.get("speed_limit_kph", 50.0)

            # Check live conditions
            traffic_mult = traffic_map.get(road_id, edge.get("traffic_multiplier", 1.0))
            inc_severity = incident_map.get(road_id, edge.get("incident_severity", None))

            cost_info = RouteCostCalculator.calculate_edge_cost(
                distance_km=distance_km,
                speed_limit_kph=speed_limit,
                traffic_multiplier=traffic_mult,
                incident_severity=inc_severity,
                weather_impact=weather_impact
            )

            meta = {
                "road_id": road_id,
                "road_name": edge.get("name", road_id),
                "distance_km": distance_km,
                "time_mins": cost_info["estimated_time_mins"],
                "traffic_multiplier": traffic_mult,
                "incident_severity": inc_severity,
                "cost_breakdown": cost_info
            }

            self.dijkstra.add_edge(u, v, cost_info["total_cost"], metadata=meta, bidirectional=edge.get("bidirectional", True))

    def find_best_route(self, source_id: str, destination_id: str) -> Dict[str, Any]:
        """Runs Dijkstra and returns complete route details with coordinates."""
        result = self.dijkstra.compute_shortest_path(source_id, destination_id)

        if not result["found"]:
            return result

        # Construct coordinate path
        full_path_nodes = []
        polyline = []

        for node_id in result["path"]:
            node_info = self.nodes.get(node_id, {})
            full_path_nodes.append({
                "id": node_id,
                "name": node_info.get("name", node_id),
                "latitude": node_info.get("lat"),
                "longitude": node_info.get("lng")
            })
            if "lat" in node_info and "lng" in node_info:
                polyline.append([node_info["lat"], node_info["lng"]])

        result["path_nodes"] = full_path_nodes
        result["polyline"] = polyline
        return result
