# ==============================================================================
# DATABASE SESSION & CONNECTION ENGINE CONFIGURATION (session.py)
# ==============================================================================
# This module configures SQLAlchemy to connect to the database:
# 1. Neon PostgreSQL in production, with automatic pooler routing.
# 2. SQLite in development fallback mode.
# 3. Session factory (SessionLocal) for transactional queries.
# 4. FastAPI dependency injection (get_db) for safe connection lifecycle.
# ==============================================================================

import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Use standard uvicorn error logger for unified logging output
logger = logging.getLogger("uvicorn.error")

# Load environment variables from .env file without overriding existing process variables
load_dotenv(override=False)

# Detect current running environment: 'production', 'prod', or 'development'
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV in {"prod", "production"}

# Read database connection URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# Setting to allow local developer SQLite database if PostgreSQL is not reachable
ALLOW_SQLITE_DEV_FALLBACK = os.getenv("ALLOW_SQLITE_DEV_FALLBACK", "false").lower() in ("true", "1", "yes")

# Production safety guards: prevent accidental SQLite usage or insecure fallbacks in production
if IS_PRODUCTION and (not DATABASE_URL or DATABASE_URL.lower().startswith("sqlite")):
    raise RuntimeError("Production requires DATABASE_URL to point to PostgreSQL.")
if IS_PRODUCTION and ALLOW_SQLITE_DEV_FALLBACK:
    raise RuntimeError("ALLOW_SQLITE_DEV_FALLBACK must be disabled in production.")


def _sqlite_default_url() -> str:
    """Resolves local attendance.db absolute file path for SQLite fallback."""
    db_path = (Path(__file__).resolve().parent.parent / "attendance.db").resolve()
    return f"sqlite:///{db_path}"


def _normalize_database_url(url: str) -> str:
    """
    Standardizes connection string:
    1. Returns SQLite path if url is empty.
    2. Resolves relative SQLite paths to absolute paths.
    3. Rewrites Neon PostgreSQL URLs to use the pooled endpoint (-pooler.neon.tech)
       to avoid TCP handshake latency and idle connection exhaustion.
    """
    if not url:
        return _sqlite_default_url()
    if url.startswith("sqlite:///"):
        path_part = url[len("sqlite:///"):]
        # If relative path, resolve to canonical attendance.db location
        if not (len(path_part) > 2 and path_part[1] == ":" or path_part.startswith("/")):
            return _sqlite_default_url()

    # Automatically enforce Neon connection pooler endpoint (-pooler.neon.tech)
    if "neon.tech" in url and "-pooler" not in url:
        import re
        pooled_url = re.sub(r'(@[a-zA-Z0-9_\-]+)(\.[a-zA-Z0-9_\.\-]+\.neon\.tech)', r'\1-pooler\2', url)
        if "-pooler" not in pooled_url:
            pooled_url = re.sub(r'(@[a-zA-Z0-9_\-]+)(\.)', r'\1-pooler\2', url, count=1)
        logger.info("[DB POOLER] Enforced Neon pooled connection endpoint (-pooler.neon.tech)")
        return pooled_url

    return url


def _create_engine(url: str):
    """
    Instantiates SQLAlchemy engine with database-specific optimization parameters:
    - SQLite: check_same_thread=False (allows multi-threaded FastAPI access)
    - PostgreSQL: sets Asia/Kolkata timezone, connection timeout, and connection pool recycling
    """
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif "postgresql" in url:
        connect_args["connect_timeout"] = 30
        connect_args["options"] = "-c timezone=Asia/Kolkata"

    engine_kwargs = {
        "echo": False,          # Set to True if SQL query debugging output is required
        "pool_pre_ping": True, # Tests connection before executing queries to prevent dead socket errors
        "connect_args": connect_args
    }
    if not url.startswith("sqlite"):
        # Neon PgBouncer transaction pooling configuration:
        # Small pool size with fast recycle avoids stale or hung connections
        engine_kwargs["pool_size"] = 5
        engine_kwargs["max_overflow"] = 10
        engine_kwargs["pool_timeout"] = 30
        engine_kwargs["pool_recycle"] = 120

    return create_engine(url, **engine_kwargs)


# Normalize configured URL
DATABASE_URL = _normalize_database_url(DATABASE_URL)

# Establish database engine connection
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

# Session factory that creates individual database sessions for incoming requests
SessionLocal = sessionmaker(
    autocommit=False,  # Transactions must be explicitly committed using db.commit()
    autoflush=False,   # Avoids unexpected premature flushes before commit
    bind=engine
)


def get_db():
    """
    FastAPI dependency that yields a database session for a single request,
    then automatically closes it when the request is finished.
    If an error occurs, it rolls back any uncommitted changes.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()  # Rollback on unhandled exceptions
        raise
    finally:
        db.close()     # Return connection back to the connection pool
