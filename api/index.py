import sys
import os

# Add root directory to sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

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
            "detail": str(e)
        }
