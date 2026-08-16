import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv

load_dotenv()

# Read and validate DATABASE_URL environment variable safely
raw_db_url = (os.getenv("DATABASE_URL") or "").strip()

# If empty, blank, or placeholder string, use safe SQLite database URL
if not raw_db_url or "=" in raw_db_url or len(raw_db_url) < 6:
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
        DATABASE_URL = "sqlite:///:memory:"
    else:
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        DEFAULT_DB_PATH = os.path.join(BASE_DIR, "deliveries.db")
        DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"
else:
    # Fix legacy postgres:// prefix for SQLAlchemy 2.0 compatibility
    if raw_db_url.startswith("postgres://"):
        DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = raw_db_url

if DATABASE_URL.startswith("sqlite:///:memory:"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
elif DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    engine = create_engine(DATABASE_URL, echo=False)

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
    """Initialize database tables with exception safety."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Database init warning: {e}")

# Safe initial call
init_db()
