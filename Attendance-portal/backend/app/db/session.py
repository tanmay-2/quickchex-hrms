import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

logger = logging.getLogger("uvicorn.error")
load_dotenv(override=False)

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV in {"prod", "production"}
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
ALLOW_SQLITE_DEV_FALLBACK = os.getenv("ALLOW_SQLITE_DEV_FALLBACK", "false").lower() in ("true", "1", "yes")

if IS_PRODUCTION and (not DATABASE_URL or DATABASE_URL.lower().startswith("sqlite")):
    raise RuntimeError("Production requires DATABASE_URL to point to PostgreSQL.")
if IS_PRODUCTION and ALLOW_SQLITE_DEV_FALLBACK:
    raise RuntimeError("ALLOW_SQLITE_DEV_FALLBACK must be disabled in production.")


def _sqlite_default_url() -> str:
    db_path = (Path(__file__).resolve().parent.parent / "attendance.db").resolve()
    return f"sqlite:///{db_path}"


def _normalize_database_url(url: str) -> str:
    if not url:
        return _sqlite_default_url()
    if url.startswith("sqlite:///"):
        path_part = url[len("sqlite:///"):]
        # If relative path, resolve to canonical attendance.db location
        if not (len(path_part) > 2 and path_part[1] == ":" or path_part.startswith("/")):
            return _sqlite_default_url()
    return url


def _create_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif "postgresql" in url:
        connect_args["connect_timeout"] = 30
        connect_args["options"] = "-c timezone=Asia/Kolkata"

    engine_kwargs = {
        "echo": False,
        "pool_pre_ping": True,
        "connect_args": connect_args
    }
    if not url.startswith("sqlite"):
        engine_kwargs["pool_size"] = 10
        engine_kwargs["max_overflow"] = 20
        engine_kwargs["pool_recycle"] = 1800

    return create_engine(url, **engine_kwargs)


DATABASE_URL = _normalize_database_url(DATABASE_URL)

if DATABASE_URL:
    try:
        engine = _create_engine(DATABASE_URL)
        with engine.connect():
            if DATABASE_URL.startswith("sqlite"):
                logger.info(f"Successfully connected to local SQLite database: {DATABASE_URL}")
            else:
                logger.info("Successfully connected to primary PostgreSQL database.")
    except Exception as exc:
        err_msg = f"[DATABASE FATAL] Database connection failed: {exc}"
        logger.error(err_msg)
        print(err_msg)
        if ALLOW_SQLITE_DEV_FALLBACK:
            logger.warning("[DEV ONLY] ALLOW_SQLITE_DEV_FALLBACK is True. Falling back to local development SQLite.")
            DATABASE_URL = _sqlite_default_url()
            engine = _create_engine(DATABASE_URL)
        else:
            raise RuntimeError(
                "FATAL: Unable to connect to configured database. "
                "Silent fallback to SQLite is disabled for production data integrity. "
                f"Error: {exc}"
            )
else:
    if ALLOW_SQLITE_DEV_FALLBACK:
        logger.warning("[DEV ONLY] No DATABASE_URL provided. Using SQLite development database because ALLOW_SQLITE_DEV_FALLBACK is enabled.")
        DATABASE_URL = _sqlite_default_url()
        engine = _create_engine(DATABASE_URL)
    else:
        err_msg = "FATAL: DATABASE_URL environment variable is required. Silent fallback to SQLite is disabled."
        logger.error(err_msg)
        print(err_msg)
        raise RuntimeError(err_msg)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
