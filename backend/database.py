import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "deliveries.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Locations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        category TEXT NOT NULL, -- Warehouse, Customer, Depot, Hub
        lat REAL NOT NULL,
        lng REAL NOT NULL
    );
    """)

    # 2. Roads (Graph Edges) Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS roads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        target_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        distance_km REAL NOT NULL,
        speed_limit_kph INTEGER NOT NULL DEFAULT 40,
        traffic_multiplier REAL NOT NULL DEFAULT 1.0, -- 1.0 = Normal, 2.0 = Heavy, 3.0 = Severe
        is_one_way INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (source_id) REFERENCES locations (id),
        FOREIGN KEY (target_id) REFERENCES locations (id)
    );
    """)

    # 3. Drivers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vehicle_type TEXT NOT NULL, -- Light Van, Medium Truck, Heavy Truck, Bike
        max_payload_kg INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Available', -- Available, On Duty, Off Duty
        current_location_id INTEGER,
        FOREIGN KEY (current_location_id) REFERENCES locations (id)
    );
    """)

    # 4. Delivery Orders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_code TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        destination_id INTEGER NOT NULL,
        weight_kg REAL NOT NULL,
        priority TEXT NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Express
        status TEXT NOT NULL DEFAULT 'Pending', -- Pending, In Transit, Delivered, Cancelled
        assigned_driver_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (destination_id) REFERENCES locations (id),
        FOREIGN KEY (assigned_driver_id) REFERENCES drivers (id)
    );
    """)

    # 5. Route History Log Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS route_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_location_id INTEGER NOT NULL,
        destination_location_id INTEGER NOT NULL,
        vehicle_type TEXT NOT NULL,
        avoid_traffic INTEGER NOT NULL DEFAULT 1,
        total_distance_km REAL NOT NULL,
        total_time_mins REAL NOT NULL,
        path_nodes_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (start_location_id) REFERENCES locations (id),
        FOREIGN KEY (destination_location_id) REFERENCES locations (id)
    );
    """)

    conn.commit()

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM locations")
    if cursor.fetchone()[0] == 0:
        seed_initial_data(cursor)
        conn.commit()

    conn.close()

def seed_initial_data(cursor):
    # Seed Locations (Bengaluru central network matching reference map)
    locations = [
        ("Central Warehouse", "MG Road / Cubbon Park, Bengaluru", "Depot", 12.9738, 77.5960),
        ("Customer A", "100 Feet Rd, Indiranagar, Bengaluru", "Customer", 12.9784, 77.6408),
        ("Customer B", "80 Feet Rd, Koramangala, Bengaluru", "Customer", 12.9352, 77.6245),
        ("Customer C", "Lalbagh Main Gate, Bengaluru", "Customer", 12.9507, 77.5848),
        ("Customer D", "Residency Rd, Shanthala Nagar, Bengaluru", "Customer", 12.9667, 77.5985),
        ("Customer E", "Austin Town Main Rd, Bengaluru", "Customer", 12.9610, 77.6140),
        ("Customer F", "HAL Old Airport Rd, Domlur, Bengaluru", "Customer", 12.9602, 77.6444),
        ("Hub Ulsoor", "Ulsoor Lake Road, Bengaluru", "Hub", 12.9817, 77.6200),
        ("Hub Wilson Garden", "Chinnayanpalya, Wilson Garden, Bengaluru", "Hub", 12.9480, 77.5970),
        ("Hub Gandhinagar", "KG Road, Gandhinagar, Bengaluru", "Hub", 12.9780, 77.5730)
    ]
    cursor.executemany(
        "INSERT INTO locations (name, address, category, lat, lng) VALUES (?, ?, ?, ?, ?)",
        locations
    )

    # Seed Roads (Graph edges connecting locations)
    # IDs: 1:Central Warehouse, 2:Cust A, 3:Cust B, 4:Cust C, 5:Cust D, 6:Cust E, 7:Cust F, 8:Hub Ulsoor, 9:Hub Wilson, 10:Hub Gandhinagar
    roads = [
        # Source, Target, Name, Distance(km), Speed Limit(km/h), Traffic Multiplier, Is One Way
        (1, 5, "MG Road to Residency Rd", 1.8, 50, 1.2, 0),
        (1, 8, "Cubbon Rd to Ulsoor", 2.9, 50, 1.1, 0),
        (1, 10, "Kasturba Rd to Gandhinagar", 2.7, 45, 1.8, 0),
        (5, 6, "Richmond Rd to Austin Town", 2.2, 40, 1.3, 0),
        (5, 9, "Wilson Garden Flyover Rd", 2.5, 45, 1.1, 0),
        (5, 4, "Kasturba Rd to Lalbagh", 2.4, 50, 1.4, 0),
        (4, 9, "Lalbagh Fort Rd to Wilson Garden", 1.5, 40, 1.0, 0),
        (4, 3, "Hosur Rd to Koramangala", 4.8, 60, 2.2, 0), # High traffic road
        (9, 3, "Intermediate Ring Rd to Koramangala", 3.6, 50, 1.2, 0),
        (6, 7, "ASC Centre Rd to Domlur", 3.4, 50, 1.0, 0),
        (7, 2, "100 Feet Rd to Indiranagar", 2.5, 40, 1.5, 0),
        (8, 2, "Halasuru Rd to Indiranagar", 2.8, 45, 1.1, 0),
        (8, 7, "HAL Old Airport Rd", 3.2, 60, 1.9, 0), # Busy arterial road
        (6, 3, "Neelasandra to Koramangala", 3.9, 45, 1.3, 0),
        (10, 4, "Subedar Chatram Rd to Lalbagh", 3.8, 40, 2.0, 0)
    ]
    cursor.executemany(
        """INSERT INTO roads 
           (source_id, target_id, name, distance_km, speed_limit_kph, traffic_multiplier, is_one_way) 
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        roads
    )

    # Seed Drivers
    drivers = [
        ("Rajesh Kumar", "Medium Truck", 5000, "Available", 1),
        ("Suresh Sharma", "Light Van", 2000, "On Duty", 8),
        ("Amit Patel", "Bike", 100, "Available", 5),
        ("Priya Verma", "Heavy Truck", 12000, "Available", 1),
        ("Vikram Singh", "Medium Truck", 5000, "Off Duty", 9)
    ]
    cursor.executemany(
        "INSERT INTO drivers (name, vehicle_type, max_payload_kg, status, current_location_id) VALUES (?, ?, ?, ?, ?)",
        drivers
    )

    # Seed Orders
    orders = [
        ("ORD-8941", "TechCorp Pvt Ltd", 2, 450.0, "High", "Pending", 1),
        ("ORD-8942", "Retail Hub B", 3, 1200.0, "Medium", "In Transit", 2),
        ("ORD-8943", "Green Gardens Market", 4, 300.0, "Express", "Pending", 3),
        ("ORD-8944", "Shanthi Enterprises", 5, 150.0, "Low", "Delivered", 1),
        ("ORD-8945", "Domlur Logistics Hub", 7, 850.0, "High", "Pending", None)
    ]
    cursor.executemany(
        """INSERT INTO orders 
           (order_code, customer_name, destination_id, weight_kg, priority, status, assigned_driver_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        orders
    )

if __name__ == "__main__":
    init_db()
    print("Database initialized and seeded successfully.")
