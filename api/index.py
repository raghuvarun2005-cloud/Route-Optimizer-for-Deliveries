import os
import sys

# Ensure root and backend directories are in sys.path for Vercel Serverless environment
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

for p in [ROOT_DIR, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.main import app
except Exception as e:
    from fastapi import FastAPI
    app = FastAPI(title="Fallback API Handler")

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def catch_all_fallback(path: str):
        return {
            "status": "error",
            "message": "FastAPI Serverless Function Exception",
            "detail": str(e),
            "sys_path": sys.path
        }
