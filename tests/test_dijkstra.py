import pytest
from backend.graph_optimizer import GraphOptimizer

SAMPLE_LOCATIONS = [
    {"id": 1, "name": "Depot", "address": "Depot St", "category": "Depot", "lat": 12.97, "lng": 77.59},
    {"id": 2, "name": "Node A", "address": "Alpha St", "category": "Hub", "lat": 12.98, "lng": 77.60},
    {"id": 3, "name": "Node B", "address": "Beta St", "category": "Customer", "lat": 12.99, "lng": 77.61},
    {"id": 4, "name": "Node C", "address": "Gamma St", "category": "Customer", "lat": 12.96, "lng": 77.58},
]

SAMPLE_ROADS = [
    {"id": 101, "source_id": 1, "target_id": 2, "name": "Direct Road (Congested)", "distance_km": 5.0, "speed_limit_kph": 50, "traffic_multiplier": 3.0, "is_one_way": 0},
    {"id": 102, "source_id": 1, "target_id": 4, "name": "Bypass Part 1", "distance_km": 3.0, "speed_limit_kph": 60, "traffic_multiplier": 1.0, "is_one_way": 0},
    {"id": 103, "source_id": 4, "target_id": 2, "name": "Bypass Part 2", "distance_km": 3.0, "speed_limit_kph": 60, "traffic_multiplier": 1.0, "is_one_way": 0},
    {"id": 104, "source_id": 2, "target_id": 3, "name": "Final Road", "distance_km": 2.0, "speed_limit_kph": 40, "traffic_multiplier": 1.0, "is_one_way": 0},
]

def test_dijkstra_finds_route():
    optimizer = GraphOptimizer(SAMPLE_LOCATIONS, SAMPLE_ROADS)
    result = optimizer.dijkstra_shortest_path(start_id=1, end_id=3, vehicle_type="Medium Truck", avoid_traffic=False)
    assert result["found"] is True
    assert result["total_distance_km"] > 0
    # Coordinates list contains real street curve points (e.g. 100+ street lat/lng points)
    assert len(result["coordinates"]) >= len(result["path_nodes"])

def test_dijkstra_traffic_avoidance_reroutes():
    optimizer = GraphOptimizer(SAMPLE_LOCATIONS, SAMPLE_ROADS)
    
    res_direct = optimizer.dijkstra_shortest_path(start_id=1, end_id=2, vehicle_type="Medium Truck", avoid_traffic=False, optimize_by='distance')
    assert res_direct["path_nodes"][1]["id"] == 2

    res_bypass = optimizer.dijkstra_shortest_path(start_id=1, end_id=2, vehicle_type="Medium Truck", avoid_traffic=True, optimize_by='time')
    path_ids = [n["id"] for n in res_bypass["path_nodes"]]
    assert 4 in path_ids

def test_same_start_and_destination():
    optimizer = GraphOptimizer(SAMPLE_LOCATIONS, SAMPLE_ROADS)
    result = optimizer.dijkstra_shortest_path(start_id=1, end_id=1)
    assert result["found"] is True
    assert result["total_distance_km"] == 0.0

def test_multi_stop_tsp():
    optimizer = GraphOptimizer(SAMPLE_LOCATIONS, SAMPLE_ROADS)
    result = optimizer.multi_stop_tsp_route(start_id=1, stop_ids=[3, 4])
    assert result["found"] is True
    assert len(result["directions"]) >= 2
