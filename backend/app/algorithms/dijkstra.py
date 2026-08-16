import heapq
from typing import Dict, List, Tuple, Any, Optional

class DijkstraOptimizer:
    """
    Pure Python Dijkstra's Algorithm implementation for weighted road graphs.
    Designed with a priority queue (min-heap) for O((V + E) log V) efficiency.
    """

    def __init__(self, graph: Optional[Dict[Any, List[Tuple[Any, float, Dict[str, Any]]]]] = None):
        """
        graph format:
        {
            node_u: [
                (node_v, weight, {"distance_km": float, "time_mins": float, "road_id": str, ...}),
                ...
            ]
        }
        """
        self.graph = graph if graph is not None else {}

    def add_edge(self, u: Any, v: Any, weight: float, metadata: Optional[Dict[str, Any]] = None, bidirectional: bool = True):
        """Add a weighted edge between node u and node v."""
        if metadata is None:
            metadata = {}
        if u not in self.graph:
            self.graph[u] = []
        if v not in self.graph:
            self.graph[v] = []

        self.graph[u].append((v, weight, metadata))
        if bidirectional:
            self.graph[v].append((u, weight, metadata))

    def compute_shortest_path(self, source: Any, destination: Any) -> Dict[str, Any]:
        """
        Computes the shortest path from source to destination using Dijkstra's Algorithm.

        Returns:
            dict containing:
                found: bool
                path: List of node IDs in sequence
                edges: List of edge metadata along the path
                total_cost: float
                total_distance_km: float
                total_time_mins: float
                visited_count: int
        """
        if source not in self.graph or destination not in self.graph:
            return {
                "found": False,
                "path": [],
                "edges": [],
                "total_cost": float("inf"),
                "total_distance_km": 0.0,
                "total_time_mins": 0.0,
                "visited_count": 0,
                "error": f"Source '{source}' or Destination '{destination}' not in graph network."
            }

        if source == destination:
            return {
                "found": True,
                "path": [source],
                "edges": [],
                "total_cost": 0.0,
                "total_distance_km": 0.0,
                "total_time_mins": 0.0,
                "visited_count": 1
            }

        # Min-Heap stores tuples: (accumulated_cost, current_node)
        pq = [(0.0, source)]
        
        # Track minimum cost to reach each node
        costs = {node: float("inf") for node in self.graph}
        costs[source] = 0.0

        # Track predecessors for path reconstruction: {node: (prev_node, edge_metadata)}
        predecessors = {}
        
        visited = set()
        visited_count = 0

        while pq:
            current_cost, current_node = heapq.heappop(pq)

            if current_node in visited:
                continue

            visited.add(current_node)
            visited_count += 1

            # Early stopping if we reached the target destination
            if current_node == destination:
                break

            # If we popped a stale entry with cost higher than known minimum, skip
            if current_cost > costs[current_node]:
                continue

            for neighbor, weight, metadata in self.graph.get(current_node, []):
                if neighbor in visited:
                    continue

                new_cost = current_cost + weight

                if new_cost < costs[neighbor]:
                    costs[neighbor] = new_cost
                    predecessors[neighbor] = (current_node, metadata)
                    heapq.heappush(pq, (new_cost, neighbor))

        if destination not in predecessors and source != destination:
            return {
                "found": False,
                "path": [],
                "edges": [],
                "total_cost": float("inf"),
                "total_distance_km": 0.0,
                "total_time_mins": 0.0,
                "visited_count": visited_count,
                "error": f"No reachable path found between '{source}' and '{destination}'."
            }

        # Reconstruct path from destination backwards to source
        path = []
        edges = []
        curr = destination
        total_distance = 0.0
        total_time = 0.0

        while curr in predecessors:
            prev_node, edge_meta = predecessors[curr]
            path.append(curr)
            edges.append(edge_meta)
            total_distance += edge_meta.get("distance_km", 0.0)
            total_time += edge_meta.get("time_mins", 0.0)
            curr = prev_node

        path.append(source)
        path.reverse()
        edges.reverse()

        return {
            "found": True,
            "path": path,
            "edges": edges,
            "total_cost": round(costs[destination], 4),
            "total_distance_km": round(total_distance, 3),
            "total_time_mins": round(total_time, 2),
            "visited_count": visited_count
        }
