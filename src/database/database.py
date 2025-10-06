"""
Database connection and session management.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from contextlib import contextmanager

from ..utils.config import Config
from .models import Base


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
        self.engine = create_engine(self.database_url, echo=False)
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
        if self.database_url.startswith("sqlite"):
            db_path = self.database_url.replace("sqlite:///", "")
            if os.path.exists(db_path):
                return os.path.getsize(db_path)
        return 0