import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

try:
    # Optional (but included in requirements) – allows using backend/app/.env without exporting vars.
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass


# Prefer env var (used by docker-compose), fall back to local SQLite for quick start.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./taskmanager.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # Needed for SQLite when using the same connection across threads.
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()