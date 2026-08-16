import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

from backend.app.database import init_db
from backend.app.routes import routes, incidents, traffic, weather, deliveries

app = FastAPI(
    title="Route Optimizer for Deliveries API",
    description="Full-stack delivery route optimization system powered by Dijkstra's graph algorithm, dynamic rerouting, traffic, weather, and incident services.",
    version="2.0.0"
)

# Enable CORS for frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Initialize database tables on application startup."""
    init_db()

# Mount API Routers
app.include_router(routes.router)
app.include_router(incidents.router)
app.include_router(traffic.router)
app.include_router(weather.router)
app.include_router(deliveries.router)

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "Route Optimizer API",
        "version": "2.0.0",
        "database": "SQLite/SQLAlchemy"
    }

# Serve built frontend static files if available locally
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    try:
        app.mount("/static", StaticFiles(directory=FRONTEND_DIST), name="static")

        @app.get("/")
        def read_root():
            index_path = os.path.join(FRONTEND_DIST, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            return {"message": "Route Optimizer API is running. Access endpoints via /api/ routes."}
    except Exception as e:
        @app.get("/")
        def read_root_fallback():
            return {"message": "Route Optimizer API is online.", "health": "/api/health", "docs": "/docs"}
else:
    @app.get("/")
    def read_root():
        return {
            "message": "Route Optimizer API is online.",
            "health": "/api/health",
            "docs": "/docs"
        }
