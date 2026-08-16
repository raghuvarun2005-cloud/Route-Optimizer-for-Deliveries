import pytest
from backend.app.algorithms.route_optimizer import RouteCostCalculator, RouteOptimizer

def test_route_cost_calculator_traffic_impact():
    """Test cost increases appropriately with traffic multipliers."""
    low_traffic = RouteCostCalculator.calculate_edge_cost(distance_km=10.0, traffic_multiplier=1.0)
    heavy_traffic = RouteCostCalculator.calculate_edge_cost(distance_km=10.0, traffic_multiplier=2.5)

    assert heavy_traffic["total_cost"] > low_traffic["total_cost"]
    assert heavy_traffic["traffic_cost"] > 0.0

def test_route_cost_calculator_incident_impact():
    """Test severe accident incurs large penalty to trigger rerouting."""
    no_incident = RouteCostCalculator.calculate_edge_cost(distance_km=10.0, incident_severity=None)
    severe_incident = RouteCostCalculator.calculate_edge_cost(distance_km=10.0, incident_severity="SEVERE")

    assert severe_incident["total_cost"] > no_incident["total_cost"] + 400.0
    assert severe_incident["incident_cost"] == 500.0

def test_route_cost_calculator_weather_impact():
    """Test weather impact adds to route cost."""
    clear = RouteCostCalculator.calculate_edge_cost(distance_km=10.0, weather_impact=0.0)
    storm = RouteCostCalculator.calculate_edge_cost(distance_km=10.0, weather_impact=0.8)

    assert storm["total_cost"] > clear["total_cost"]
    assert storm["weather_cost"] > 0.0

def test_route_optimizer_bypasses_blocked_road():
    """Test RouteOptimizer picks alternative bypass when main road has severe accident."""
    nodes = {
        "SRC": {"name": "Warehouse", "lat": 12.9, "lng": 77.5},
        "MAIN_J1": {"name": "Main J1", "lat": 12.92, "lng": 77.52},
        "DEST": {"name": "Customer", "lat": 12.95, "lng": 77.55},
        "BYPASS_J1": {"name": "Bypass J1", "lat": 12.91, "lng": 77.58}
    }
    edges = [
        {"u": "SRC", "v": "MAIN_J1", "distance_km": 3.0, "road_id": "MAIN_ROAD"},
        {"u": "MAIN_J1", "v": "DEST", "distance_km": 3.0, "road_id": "MAIN_ROAD_2"},
        {"u": "SRC", "v": "BYPASS_J1", "distance_km": 4.0, "road_id": "BYPASS_1"},
        {"u": "BYPASS_J1", "v": "DEST", "distance_km": 4.0, "road_id": "BYPASS_2"},
    ]

    # Under clear conditions, MAIN_ROAD path is shorter (6km vs 8km)
    opt1 = RouteOptimizer(nodes, edges)
    opt1.build_graph()
    res1 = opt1.find_best_route("SRC", "DEST")
    assert res1["path"] == ["SRC", "MAIN_J1", "DEST"]

    # When MAIN_ROAD has SEVERE accident, optimizer picks BYPASS
    opt2 = RouteOptimizer(nodes, edges)
    opt2.build_graph(incident_map={"MAIN_ROAD": "SEVERE"})
    res2 = opt2.find_best_route("SRC", "DEST")
    assert res2["path"] == ["SRC", "BYPASS_J1", "DEST"]
