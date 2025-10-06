"""
Database connection and session management.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from ..utils.config import Config
from .models import Base


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

    def get_session(self) -> Generator[Session, None, None]:
        """
        Get a database session.

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