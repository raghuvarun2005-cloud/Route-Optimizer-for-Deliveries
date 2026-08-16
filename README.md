# Route Optimizer for Deliveries — Full-Stack Implementation

[![Python 3.10](https://img.shields.io/badge/Python-3.10-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Tests Passing](https://img.shields.io/badge/Tests-10%2F10_Passing-brightgreen?style=for-the-badge)](https://pytest.org)

A practical, realistic delivery route optimization system built with **Python (FastAPI)**, **SQLAlchemy ORM (SQLite/PostgreSQL)**, and **React + Vite + Leaflet + Tailwind CSS**.

Unlike standard shortest-path demos, this application features **Dynamic Real-Time Rerouting**, re-anchoring route calculation from the vehicle's **live current position** whenever road accidents, severe congestion, or weather hazards are detected ahead.

---

## 1. Project Overview & Problem Statement

### Problem Statement
Last-mile delivery systems frequently fail due to unpredictable road conditions. Traditional static routing calculates a path prior to dispatch but cannot adapt dynamically once the vehicle is mid-transit. When an accident or road blockage occurs on an active segment:
- Drivers get stuck in severe delays.
- Naive navigation systems simply re-calculate from the *original warehouse starting point*, rather than from the vehicle's *current real-time location*.

### Solution
This project implements a weighted graph delivery routing system powered by **Dijkstra's Shortest Path Algorithm**. It evaluates dynamic multi-variable edge costs:
$$\text{Cost} = \text{Distance Cost} + \text{Traffic Cost} + \text{Incident Cost} + \text{Weather Cost}$$

When a road incident is detected during navigation:
1. The system identifies the vehicle's **current position** coordinates.
2. Re-weights graph edges with active incident penalties.
3. Computes the optimal alternative path **starting from the current vehicle location** to the destination.
4. Renders the new route on Leaflet/OpenStreetMap while displaying distance and estimated time saved.

---

## 2. Technology Stack

* **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic v2, Pytest.
* **Database**: SQLite (default zero-config local DB `deliveries.db`) or PostgreSQL.
* **Frontend**: React 18, Vite, JavaScript, Tailwind CSS, Leaflet (`react-leaflet`), Lucide Icons.
* **External APIs**:
  - OpenStreetMap Nominatim API for geocoding address searches.
  - OpenWeatherMap API for weather conditions & impact evaluation (with graceful mock fallback).
  - TomTom / Mock Traffic API for road segment congestion multipliers.

---

## 3. Architecture & Project Structure

```
route-optimizer/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application & router mounts
│   │   ├── database.py              # SQLAlchemy engine & session manager
│   │   ├── models/                  # ORM Schemas (User, Location, Delivery, Route, Incident, RouteUpdate)
│   │   ├── schemas/                 # Pydantic validation schemas
│   │   ├── algorithms/
│   │   │   ├── dijkstra.py          # Priority queue Dijkstra implementation
│   │   │   └── route_optimizer.py   # Dynamic edge cost calculator & graph engine
│   │   ├── services/
│   │   │   ├── traffic_service.py   # Traffic level evaluator & mock fallback
│   │   │   ├── weather_service.py   # OpenWeatherMap & fallback service
│   │   │   ├── incident_service.py  # Spatial incident registry & segment matching
│   │   │   └── routing_service.py   # Graph network generator & rerouting orchestrator
│   │   └── routes/                  # REST API endpoints (routes, incidents, weather, traffic, deliveries)
│   ├── tests/                       # Pytest test suite (10 unit tests)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # App navbar & system status indicators
│   │   │   ├── ControlPanel.jsx     # Source/Dest inputs, map picker, simulation controls
│   │   │   ├── MapView.jsx          # Leaflet map with custom icons & polyline rendering
│   │   │   ├── InfoPanel.jsx        # Summary cards (Distance, Time, Weather, Traffic, Dijkstra Cost)
│   │   │   └── DynamicRerouteBanner.jsx # Rerouting alert & metric diff comparison
│   │   ├── services/api.js          # Axios API service layer
│   │   ├── App.jsx                  # Main state container & simulation loop
│   │   ├── main.jsx                 # Vite entrypoint
│   │   └── index.css                # Tailwind CSS & Leaflet custom styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

---

## 4. Key Features

1. **Location Input**: Search by location name (Geocoding via Nominatim) or select points directly on the interactive Leaflet map. Supports intermediate delivery stop waypoints.
2. **Graph-Based Route Optimization**:
   - Priority-queue Min-Heap Dijkstra algorithm ($O((V + E) \log V)$ complexity).
   - Dynamic edge cost equation:
     $$\text{Cost} = d \cdot w_{\text{dist}} + d(m_{\text{traffic}} - 1) \cdot w_{\text{traffic}} + P_{\text{incident}} \cdot w_{\text{incident}} + d \cdot I_{\text{weather}} \cdot w_{\text{weather}}$$
3. **Live Delivery Simulation**: "Start Delivery" animates the delivery truck along the active polyline in real-time.
4. **Dynamic Mid-Drive Rerouting (Core Feature)**:
   - Clicking **Simulate Incident** places a severe accident on the active road ahead.
   - System immediately detects route conflict, re-anchors source node to vehicle's **current position**, recalculates Dijkstra path from vehicle position to destination, and updates map polyline.
   - Metric comparison card displays new distance and exact **estimated time saved**.
5. **Resilient API Architecture**: If external weather or traffic APIs fail or keys are missing, the system gracefully falls back to deterministic mock services with clear status flags without crashing.

---

## 5. Database Design (SQLAlchemy ORM)

* `users`: `id`, `name`, `email`, `created_at`
* `locations`: `id`, `name`, `address`, `latitude`, `longitude`
* `deliveries`: `id`, `source_location`, `destination_location`, `source_lat`, `source_lng`, `dest_lat`, `dest_lng`, `status`, `created_at`
* `routes`: `id`, `delivery_id`, `total_distance`, `estimated_time`, `total_cost`, `algorithm_used`, `path_data`, `created_at`
* `incidents`: `id`, `road_id`, `type`, `severity` (`LOW`, `MODERATE`, `HIGH`, `SEVERE`), `status`, `latitude`, `longitude`, `description`, `created_at`
* `route_updates`: `id`, `delivery_id`, `old_route_data`, `new_route_data`, `reason`, `created_at`

---

## 6. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/routes/calculate` | Compute optimal initial route between source & destination |
| `POST` | `/api/routes/{id}/reroute` | Recalculate route **from vehicle's current position** |
| `GET` | `/api/incidents` | List active road incidents |
| `POST` | `/api/incidents` | Create a simulated road incident |
| `DELETE` | `/api/incidents/clear/all` | Clear all active incidents |
| `GET` | `/api/weather` | Retrieve weather condition & impact factor |
| `GET` | `/api/traffic` | Retrieve traffic congestion & delay metrics |

---

## 7. Setup & Installation Guide

### Prerequisites
* Python 3.10+
* Node.js v18+ & npm

### Backend Setup
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run Pytest backend test suite (10 tests)
python -m pytest backend/tests

# 3. Start FastAPI server (runs on http://127.0.0.1:8000)
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend Setup
```bash
# 1. Navigate to frontend directory & install npm dependencies
cd frontend
npm install

# 2. Start Vite development server (runs on http://localhost:5173)
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## 8. Technical Interview Walkthrough Guide

When presenting this project in a technical interview, follow this 5-step sequence:

1. **Explain the Graph Formulation**:
   - Point out `backend/app/algorithms/dijkstra.py` and `route_optimizer.py`.
   - Explain how roads are represented as weighted graph edges, where cost is a composite function of distance, traffic multipliers, weather impact, and incident penalties.

2. **Calculate Initial Route**:
   - Select preset locations (e.g. *Downtown City Center* → *Tech Park Hub*).
   - Click **Calculate Optimal Route**. Show the green polyline drawn on the Leaflet map and explain the initial distance and travel time.

3. **Start Delivery Simulation**:
   - Click **Start Delivery**. Point out the delivery truck marker animating step-by-step along the path towards the destination.

4. **Demonstrate Dynamic Rerouting (The Wow Factor)**:
   - While the truck is moving mid-way, click **Simulate Incident**.
   - Show how the banner instantly displays: `⚠️ Incident Detected Ahead -> Rerouting from current vehicle position`.
   - Point out that Dijkstra recalculated the shortest path starting **from the vehicle's live coordinates**, bypassing the blocked road segment onto an alternative highway bypass.
   - Show the metric comparison card highlighting **Estimated Time Saved**.

5. **Show Database & Test Integrity**:
   - Run `python -m pytest backend/tests` to demonstrate 100% test coverage on Dijkstra logic, cost formulas, and rerouting mechanics.
