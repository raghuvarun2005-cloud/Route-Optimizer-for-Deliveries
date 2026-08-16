import os
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional

from backend.database import get_db_connection, init_db
from backend.graph_optimizer import GraphOptimizer

app = FastAPI(title="Delivery Route Optimizer API", version="1.0.0")

@app.on_event("startup")
def startup_event():
    init_db()

# --- Request / Response Models ---
class RouteRequest(BaseModel):
    start_id: int
    destination_id: int
    vehicle_type: Optional[str] = "Medium Truck"
    avoid_traffic: Optional[bool] = True
    optimize_by: Optional[str] = "time"

class MidDriveRerouteRequest(BaseModel):
    current_node_id: int
    destination_id: int
    vehicle_type: Optional[str] = "Medium Truck"
    avoid_traffic: Optional[bool] = True

class MultiStopRequest(BaseModel):
    start_id: int
    stop_ids: List[int]
    vehicle_type: Optional[str] = "Medium Truck"
    avoid_traffic: Optional[bool] = True

class TrafficUpdateRequest(BaseModel):
    traffic_multiplier: float

class LocationCreateRequest(BaseModel):
    name: str
    address: str
    category: str
    lat: float
    lng: float

class RoadCreateRequest(BaseModel):
    source_id: int
    target_id: int
    name: str
    distance_km: float
    speed_limit_kph: int
    traffic_multiplier: float = 1.0
    is_one_way: bool = False

class OrderCreateRequest(BaseModel):
    order_code: str
    customer_name: str
    destination_id: int
    weight_kg: float
    priority: str = "Medium"

class OrderStatusUpdate(BaseModel):
    status: str
    assigned_driver_id: Optional[int] = None

# --- Helper Functions ---
def load_graph():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations")
    locations = [dict(row) for row in cursor.fetchall()]
    cursor.execute("SELECT * FROM roads")
    roads = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return GraphOptimizer(locations, roads)

# --- API Endpoints ---

@app.get("/api/locations")
def get_locations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations ORDER BY name ASC")
    locations = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return locations

@app.post("/api/locations")
def create_location(req: LocationCreateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO locations (name, address, category, lat, lng) VALUES (?, ?, ?, ?, ?)",
        (req.name, req.address, req.category, req.lat, req.lng)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "message": "Location created successfully."}

@app.delete("/api/locations/{location_id}")
def delete_location(location_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM locations WHERE id = ?", (location_id,))
    cursor.execute("DELETE FROM roads WHERE source_id = ? OR target_id = ?", (location_id, location_id))
    conn.commit()
    conn.close()
    return {"message": "Location deleted successfully."}

@app.get("/api/roads")
def get_roads():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.*, l1.name as source_name, l2.name as target_name 
        FROM roads r
        JOIN locations l1 ON r.source_id = l1.id
        JOIN locations l2 ON r.target_id = l2.id
        ORDER BY r.id ASC
    """)
    roads = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return roads

@app.post("/api/roads")
def create_road(req: RoadCreateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO roads 
           (source_id, target_id, name, distance_km, speed_limit_kph, traffic_multiplier, is_one_way)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (req.source_id, req.target_id, req.name, req.distance_km, req.speed_limit_kph, req.traffic_multiplier, 1 if req.is_one_way else 0)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "message": "Road edge created successfully."}

@app.put("/api/roads/{road_id}/traffic")
def update_road_traffic(road_id: int, req: TrafficUpdateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE roads SET traffic_multiplier = ? WHERE id = ?", (req.traffic_multiplier, road_id))
    conn.commit()
    conn.close()
    return {"message": f"Traffic multiplier updated to {req.traffic_multiplier}x."}

@app.post("/api/optimize-route")
def optimize_route(req: RouteRequest):
    optimizer = load_graph()
    try:
        result = optimizer.dijkstra_shortest_path(
            start_id=req.start_id,
            end_id=req.destination_id,
            vehicle_type=req.vehicle_type,
            avoid_traffic=req.avoid_traffic,
            optimize_by=req.optimize_by
        )

        if result.get("found"):
            conn = get_db_connection()
            cursor = conn.cursor()
            path_ids = [node['id'] for node in result['path_nodes']]
            cursor.execute(
                """INSERT INTO route_history 
                   (start_location_id, destination_location_id, vehicle_type, avoid_traffic, total_distance_km, total_time_mins, path_nodes_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (req.start_id, req.destination_id, req.vehicle_type, 1 if req.avoid_traffic else 0,
                 result['total_distance_km'], result['total_time_mins'], json.dumps(path_ids))
            )
            conn.commit()
            conn.close()

        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/reroute-mid-drive")
def reroute_mid_drive(req: MidDriveRerouteRequest):
    optimizer = load_graph()
    try:
        return optimizer.analyze_and_reroute_mid_drive(
            current_node_id=req.current_node_id,
            destination_node_id=req.destination_id,
            vehicle_type=req.vehicle_type,
            avoid_traffic=req.avoid_traffic
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/optimize-multi-stop")
def optimize_multi_stop(req: MultiStopRequest):
    optimizer = load_graph()
    try:
        result = optimizer.multi_stop_tsp_route(
            start_id=req.start_id,
            stop_ids=req.stop_ids,
            vehicle_type=req.vehicle_type,
            avoid_traffic=req.avoid_traffic
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/orders")
def get_orders():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT o.*, l.name as destination_name, d.name as driver_name
        FROM orders o
        JOIN locations l ON o.destination_id = l.id
        LEFT JOIN drivers d ON o.assigned_driver_id = d.id
        ORDER BY o.id DESC
    """)
    orders = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return orders

@app.post("/api/orders")
def create_order(req: OrderCreateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO orders (order_code, customer_name, destination_id, weight_kg, priority)
           VALUES (?, ?, ?, ?, ?)""",
        (req.order_code, req.customer_name, req.destination_id, req.weight_kg, req.priority)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "message": "Order created successfully."}

@app.put("/api/orders/{order_id}/status")
def update_order_status(order_id: int, req: OrderStatusUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    if req.assigned_driver_id is not None:
        cursor.execute("UPDATE orders SET status = ?, assigned_driver_id = ? WHERE id = ?", (req.status, req.assigned_driver_id, order_id))
    else:
        cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (req.status, order_id))
    conn.commit()
    conn.close()
    return {"message": "Order updated successfully."}

@app.get("/api/drivers")
def get_drivers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.*, l.name as current_location_name
        FROM drivers d
        LEFT JOIN locations l ON d.current_location_id = l.id
        ORDER BY d.id ASC
    """)
    drivers = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return drivers

@app.get("/api/traffic")
def get_traffic():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.*, l1.name as source_name, l2.name as target_name
        FROM roads r
        JOIN locations l1 ON r.source_id = l1.id
        JOIN locations l2 ON r.target_id = l2.id
        ORDER BY r.traffic_multiplier DESC
    """)
    traffic = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return traffic

@app.get("/api/history")
def get_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT h.*, l1.name as start_name, l2.name as dest_name
        FROM route_history h
        JOIN locations l1 ON h.start_location_id = l1.id
        JOIN locations l2 ON h.destination_location_id = l2.id
        ORDER BY h.id DESC LIMIT 20
    """)
    history = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return history

@app.get("/api/analytics")
def get_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM orders")
    total_orders = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM orders WHERE status = 'Delivered'")
    delivered_orders = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM drivers WHERE status = 'Available' OR status = 'On Duty'")
    active_drivers = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(total_distance_km), AVG(total_time_mins), COUNT(*) FROM route_history")
    avg_dist, avg_time, total_routes = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) FROM roads WHERE traffic_multiplier >= 1.5")
    congested_roads = cursor.fetchone()[0]

    conn.close()

    return {
        "total_orders": total_orders,
        "delivered_orders": delivered_orders,
        "active_drivers": active_drivers,
        "total_routes_optimized": total_routes,
        "avg_route_distance_km": round(avg_dist or 0.0, 2),
        "avg_route_time_mins": round(avg_time or 0.0, 1),
        "congested_roads_count": congested_roads,
        "efficiency_rate_pct": round((delivered_orders / total_orders * 100) if total_orders > 0 else 94.5, 1)
    }

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
def read_root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return "<h1>Route Optimizer API is running.</h1>"
