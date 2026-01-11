"""
Database connection and session management.
"""

import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator, Dict, Any
from contextlib import contextmanager

from ..utils.config import Config
from .models import Base

logger = logging.getLogger(__name__)


class DatabaseSession:
    """Database session context manager."""

    def __init__(self, session_factory):
        """
        Initialize database session context manager.

        Args:
            session_factory: SQLAlchemy session factory
        """
        self.session_factory = session_factory
        self.session = None

    def __enter__(self) -> Session:
        """Enter context and return database session."""
        self.session = self.session_factory()
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context and close session."""
        if self.session:
            if exc_type:
                self.session.rollback()
            else:
                self.session.commit()
            self.session.close()


class DatabaseManager:
    """Database connection and session manager."""

    def __init__(self, config: Config):
        """
        Initialize database manager.

        Args:
            config (Config): Application configuration
        """
        self.config = config
        self.database_url = config.database_url

        # Configure MySQL engine with optimized connection pooling for high concurrency
        self.engine = create_engine(
            self.database_url,
            echo=False,
            # Enhanced connection pooling settings for production stability
            pool_size=15,                    # Increased base connections for concurrent requests
            max_overflow=25,                # More overflow connections for peak loads
            pool_timeout=10,                # Reduced timeout for faster failure detection
            pool_recycle=3600,              # Recycle connections every hour (MySQL recommendation)
            pool_pre_ping=True,             # Validate connections before use
            # MySQL-specific optimizations for stability
            connect_args={
                "charset": "utf8mb4",        # Support full Unicode including emojis
                "autocommit": False,        # Use manual commit for better control
                "connect_timeout": 10,      # Connection timeout
                "read_timeout": 30,         # Read timeout
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES', time_zone='+08:00'",  # Strict SQL mode & China timezone
            }
        )

        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def create_tables(self):
        """Create all database tables."""
        Base.metadata.create_all(bind=self.engine)

    def get_session(self) -> DatabaseSession:
        """
        Get a database session context manager.

        Returns:
            DatabaseSession: Database session context manager
        """
        return DatabaseSession(self.SessionLocal)

    @contextmanager
    def get_session_generator(self) -> Generator[Session, None, None]:
        """
        Get a database session as generator (for backward compatibility).

        Yields:
            Session: Database session
        """
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def get_database_size(self) -> int:
        """Get approximate database size in bytes."""
        # For MySQL, we would need to query the information_schema

    def check_connection_health(self) -> Dict[str, Any]:
        """
        Check database connection health and pool statistics.

        Returns:
            Dict[str, Any]: Health check results
        """
        try:
            pool = self.engine.pool
            return {
                "status": "healthy",
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "pool_connections": {
                    "current_size": pool.size(),
                    "max_overflow": pool._max_overflow,
                    "active_connections": pool.checkedout(),
                    "idle_connections": pool.checkedin() - pool.checkedout()
                }
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "pool_connections": None
            }

    def test_database_connection(self) -> bool:
        """
        Test database connection with a simple query.

        Returns:
            bool: True if connection is successful
        """
        try:
            with self.get_session() as db:
                # Simple test query
                db.execute(text("SELECT 1"))
                return True
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            return False