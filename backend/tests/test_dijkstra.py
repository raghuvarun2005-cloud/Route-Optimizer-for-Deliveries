import pytest
from backend.app.algorithms.dijkstra import DijkstraOptimizer

def test_dijkstra_basic_shortest_path():
    """Test Dijkstra finds the minimum cost path on a simple graph."""
    dijkstra = DijkstraOptimizer()
    # A -5-> B -2-> C (cost = 7)
    # A -10-> C       (cost = 10)
    dijkstra.add_edge("A", "B", 5.0, {"distance_km": 5.0, "time_mins": 6.0})
    dijkstra.add_edge("B", "C", 2.0, {"distance_km": 2.0, "time_mins": 3.0})
    dijkstra.add_edge("A", "C", 10.0, {"distance_km": 10.0, "time_mins": 12.0})

    result = dijkstra.compute_shortest_path("A", "C")
    assert result["found"] is True
    assert result["path"] == ["A", "B", "C"]
    assert result["total_cost"] == 7.0
    assert result["total_distance_km"] == 7.0

def test_dijkstra_multiple_paths_chooses_cheapest():
    """Test choosing cheaper multi-hop path over expensive direct link."""
    dijkstra = DijkstraOptimizer()
    dijkstra.add_edge("A", "X", 1.0, {"distance_km": 1.0, "time_mins": 1.0})
    dijkstra.add_edge("X", "Y", 1.0, {"distance_km": 1.0, "time_mins": 1.0})
    dijkstra.add_edge("Y", "B", 1.0, {"distance_km": 1.0, "time_mins": 1.0})
    dijkstra.add_edge("A", "B", 100.0, {"distance_km": 10.0, "time_mins": 15.0})

    result = dijkstra.compute_shortest_path("A", "B")
    assert result["found"] is True
    assert result["path"] == ["A", "X", "Y", "B"]
    assert result["total_cost"] == 3.0

def test_dijkstra_same_source_and_destination():
    """Test when source is destination."""
    dijkstra = DijkstraOptimizer()
    dijkstra.add_edge("A", "B", 5.0)

    result = dijkstra.compute_shortest_path("A", "A")
    assert result["found"] is True
    assert result["path"] == ["A"]
    assert result["total_cost"] == 0.0

def test_dijkstra_no_path_available():
    """Test behavior when graph is disconnected."""
    dijkstra = DijkstraOptimizer()
    dijkstra.add_edge("A", "B", 5.0)
    dijkstra.add_edge("C", "D", 5.0)

    result = dijkstra.compute_shortest_path("A", "D")
    assert result["found"] is False
    assert result["path"] == []
