from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def _sqlite_default_url() -> str:
    db_path = Path(__file__).resolve().parent.parent / "attendance.db"
    return f"sqlite:///{db_path}"


def _create_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif "postgresql" in url:
        connect_args["connect_timeout"] = 10

    return create_engine(
        url,
        echo=False,
        pool_pre_ping=True,
        connect_args=connect_args
    )


if DATABASE_URL:
    try:
        engine = _create_engine(DATABASE_URL)
        with engine.connect():
            pass
    except Exception as exc:
        print("WARNING: PostgreSQL connection failed, falling back to SQLite. Error:", exc)
        DATABASE_URL = _sqlite_default_url()
        engine = _create_engine(DATABASE_URL)
else:
    DATABASE_URL = _sqlite_default_url()
    engine = _create_engine(DATABASE_URL)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()