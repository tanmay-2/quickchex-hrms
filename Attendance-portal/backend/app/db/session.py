# ==============================================================================
# DATABASE SESSION & CONNECTION ENGINE CONFIGURATION (session.py)
# ==============================================================================
# This module configures SQLAlchemy to connect to the database:
# 1. Neon PostgreSQL in production, with automatic pooler routing.
# 2. SQLite in development fallback mode.
# 3. Session factory (SessionLocal) for transactional queries.
# 4. FastAPI dependency injection (get_db) for safe connection lifecycle.
# ==============================================================================

# Import module logging for system functionality
import logging
# Import Path from pathlib for module operations
from pathlib import Path
# Import create_engine from sqlalchemy for module operations
from sqlalchemy import create_engine
# Import sessionmaker from sqlalchemy.orm for module operations
from sqlalchemy.orm import sessionmaker
# Import module os for system functionality
import os
# Import load_dotenv from dotenv for module operations
from dotenv import load_dotenv

# Use standard uvicorn error logger for unified logging output
logger = logging.getLogger("uvicorn.error")

# Load environment variables from .env file without overriding existing process variables
load_dotenv(override=False)

# Detect current running environment: 'production', 'prod', or 'development'
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
# Set IS_PRODUCTION variable to store IS PRODUCTION value
IS_PRODUCTION = APP_ENV in {"prod", "production"}

# Read database connection URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# Setting to allow local developer SQLite database if PostgreSQL is not reachable
ALLOW_SQLITE_DEV_FALLBACK = os.getenv("ALLOW_SQLITE_DEV_FALLBACK", "false").lower() in ("true", "1", "yes")

# Production safety guards: prevent accidental SQLite usage or insecure fallbacks in production
if IS_PRODUCTION and (not DATABASE_URL or DATABASE_URL.lower().startswith("sqlite")):
    # Raise exception to abort current operation with error
    raise RuntimeError("Production requires DATABASE_URL to point to PostgreSQL.")
# Evaluate condition to control execution branch
if IS_PRODUCTION and ALLOW_SQLITE_DEV_FALLBACK:
    # Raise exception to abort current operation with error
    raise RuntimeError("ALLOW_SQLITE_DEV_FALLBACK must be disabled in production.")


# Define _sqlite_default_url function to handle  sqlite default url
def _sqlite_default_url() -> str:
    """Resolves local attendance.db absolute file path for SQLite fallback."""
    db_path = (Path(__file__).resolve().parent.parent / "attendance.db").resolve()
    # Return computed result or response payload to caller
    return f"sqlite:///{db_path}"


# Define _normalize_database_url function to handle  normalize database url
def _normalize_database_url(url: str) -> str:
    """
    Standardizes connection string:
    1. Returns SQLite path if url is empty.
    2. Resolves relative SQLite paths to absolute paths.
    3. Rewrites Neon PostgreSQL URLs to use the pooled endpoint (-pooler.neon.tech)
       to avoid TCP handshake latency and idle connection exhaustion.
    """
    if not url:
        # Return computed result or response payload to caller
        return _sqlite_default_url()
    # Evaluate condition to control execution branch
    if url.startswith("sqlite:///"):
        # Set path_part variable to store path part value
        path_part = url[len("sqlite:///"):]
        # If relative path, resolve to canonical attendance.db location
        if not (len(path_part) > 2 and path_part[1] == ":" or path_part.startswith("/")):
            # Return computed result or response payload to caller
            return _sqlite_default_url()

    # Automatically enforce Neon connection pooler endpoint (-pooler.neon.tech)
    if "neon.tech" in url and "-pooler" not in url:
        # Import module re for system functionality
        import re
        # Set pooled_url variable to store pooled url value
        pooled_url = re.sub(r'(@[a-zA-Z0-9_\-]+)(\.[a-zA-Z0-9_\.\-]+\.neon\.tech)', r'\1-pooler\2', url)
        # Check if target condition is false or object is missing
        if "-pooler" not in pooled_url:
            # Set pooled_url variable to store pooled url value
            pooled_url = re.sub(r'(@[a-zA-Z0-9_\-]+)(\.)', r'\1-pooler\2', url, count=1)
        # Log informational message for system observability
        logger.info("[DB POOLER] Enforced Neon pooled connection endpoint (-pooler.neon.tech)")
        # Return computed result or response payload to caller
        return pooled_url

    # Return computed result or response payload to caller
    return url


# Define _create_engine function to handle  create engine
def _create_engine(url: str):
    """
    Instantiates SQLAlchemy engine with database-specific optimization parameters:
    - SQLite: check_same_thread=False (allows multi-threaded FastAPI access)
    - PostgreSQL: sets Asia/Kolkata timezone, connection timeout, and connection pool recycling
    """
    connect_args = {}
    # Evaluate condition to control execution branch
    if url.startswith("sqlite"):
        # Execute statement to process data and maintain state
        connect_args["check_same_thread"] = False
    # Evaluate alternate branch condition
    elif "postgresql" in url:
        # Execute statement to process data and maintain state
        connect_args["connect_timeout"] = 30
        # Execute statement to process data and maintain state
        connect_args["options"] = "-c timezone=Asia/Kolkata"

    # Set engine_kwargs variable to store engine kwargs value
    engine_kwargs = {
        "echo": False,          # Set to True if SQL query debugging output is required
        "pool_pre_ping": True, # Tests connection before executing queries to prevent dead socket errors
        # Execute statement to process data and maintain state
        "connect_args": connect_args
    # Execute statement to process data and maintain state
    }
    # Check if target condition is false or object is missing
    if not url.startswith("sqlite"):
        # Neon PgBouncer transaction pooling configuration:
        # Small pool size with fast recycle avoids stale or hung connections
        engine_kwargs["pool_size"] = 5
        # Execute statement to process data and maintain state
        engine_kwargs["max_overflow"] = 10
        # Execute statement to process data and maintain state
        engine_kwargs["pool_timeout"] = 30
        # Execute statement to process data and maintain state
        engine_kwargs["pool_recycle"] = 120

    # Return computed result or response payload to caller
    return create_engine(url, **engine_kwargs)


# Normalize configured URL
DATABASE_URL = _normalize_database_url(DATABASE_URL)

# Establish database engine connection
if DATABASE_URL:
    # Begin guarded execution block to trap exceptions
    try:
        # Set engine variable to store engine value
        engine = _create_engine(DATABASE_URL)
        # Acquire context manager resource for enclosed block
        with engine.connect():
            # Evaluate condition to control execution branch
            if DATABASE_URL.startswith("sqlite"):
                # Log informational message for system observability
                logger.info(f"Successfully connected to local SQLite database: {DATABASE_URL}")
            # Execute fallback branch when conditions are not met
            else:
                # Log informational message for system observability
                logger.info("Successfully connected to primary PostgreSQL database.")
    # Catch and handle specific exception if raised
    except Exception as exc:
        # Set err_msg variable to store err msg value
        err_msg = f"[DATABASE FATAL] Database connection failed: {exc}"
        # Log error message with failure diagnostic details
        logger.error(err_msg)
        # Invoke print to perform operational action
        print(err_msg)
        # Evaluate condition to control execution branch
        if ALLOW_SQLITE_DEV_FALLBACK:
            # Log warning message for non-fatal unexpected condition
            logger.warning("[DEV ONLY] ALLOW_SQLITE_DEV_FALLBACK is True. Falling back to local development SQLite.")
            # Set DATABASE_URL variable to store DATABASE URL value
            DATABASE_URL = _sqlite_default_url()
            # Set engine variable to store engine value
            engine = _create_engine(DATABASE_URL)
        # Execute fallback branch when conditions are not met
        else:
            # Raise exception to abort current operation with error
            raise RuntimeError(
                # Execute statement to process data and maintain state
                "FATAL: Unable to connect to configured database. "
                # Execute statement to process data and maintain state
                "Silent fallback to SQLite is disabled for production data integrity. "
                # Execute statement to process data and maintain state
                f"Error: {exc}"
            # Execute statement to process data and maintain state
            )
# Execute fallback branch when conditions are not met
else:
    # Evaluate condition to control execution branch
    if ALLOW_SQLITE_DEV_FALLBACK:
        # Log warning message for non-fatal unexpected condition
        logger.warning("[DEV ONLY] No DATABASE_URL provided. Using SQLite development database because ALLOW_SQLITE_DEV_FALLBACK is enabled.")
        # Set DATABASE_URL variable to store DATABASE URL value
        DATABASE_URL = _sqlite_default_url()
        # Set engine variable to store engine value
        engine = _create_engine(DATABASE_URL)
    # Execute fallback branch when conditions are not met
    else:
        # Set err_msg variable to store err msg value
        err_msg = "FATAL: DATABASE_URL environment variable is required. Silent fallback to SQLite is disabled."
        # Log error message with failure diagnostic details
        logger.error(err_msg)
        # Invoke print to perform operational action
        print(err_msg)
        # Raise exception to abort current operation with error
        raise RuntimeError(err_msg)

# Session factory that creates individual database sessions for incoming requests
SessionLocal = sessionmaker(
    autocommit=False,  # Transactions must be explicitly committed using db.commit()
    autoflush=False,   # Avoids unexpected premature flushes before commit
    # Set bind variable to store bind value
    bind=engine
# Execute statement to process data and maintain state
)


# Define get_db function to handle get db
def get_db():
    """
    FastAPI dependency that yields a database session for a single request,
    then automatically closes it when the request is finished.
    If an error occurs, it rolls back any uncommitted changes.
    """
    db = SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # Yield active session or generator value to caller
        yield db
    # Catch and handle specific exception if raised
    except Exception:
        db.rollback()  # Rollback on unhandled exceptions
        # Raise exception to abort current operation with error
        raise
    # Execute cleanup actions regardless of exceptions
    finally:
        db.close()     # Return connection back to the connection pool
