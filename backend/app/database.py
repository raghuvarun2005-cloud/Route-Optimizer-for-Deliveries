import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Default to local SQLite database; on Vercel Serverless environment use writable /tmp directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
    DEFAULT_DB_PATH = "/tmp/deliveries.db"
else:
    DEFAULT_DB_PATH = os.path.join(BASE_DIR, "deliveries.db")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for obtaining database sessions in FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
