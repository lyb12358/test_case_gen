# -*- coding: utf-8 -*-
"""
FastAPI dependency injection configuration.
Provides unified database session management following FastAPI and SQLAlchemy best practices.
"""

import logging
from typing import Generator, Optional
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from fastapi import Depends

from ..database.database import DatabaseManager
from ..utils.config import Config
from ..database.models import Project

logger = logging.getLogger(__name__)

# Global database manager instance for connection pooling
_db_manager = None

def get_database_manager() -> DatabaseManager:
    """
    Get or create a singleton database manager instance.
    This ensures proper connection pooling and resource management.
    """
    global _db_manager
    if _db_manager is None:
        try:
            config = Config()
            _db_manager = DatabaseManager(config)
            logger.info("Database manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database manager: {str(e)}")
            raise
    return _db_manager


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database session management.

    This function follows FastAPI and SQLAlchemy best practices:
    - Uses context managers for proper resource cleanup
    - Implements connection pooling through the DatabaseManager
    - Handles transaction management automatically
    - Ensures sessions are properly closed even on exceptions

    Yields:
        Session: SQLAlchemy database session

    Usage:
        @router.get("/items")
        async def get_items(db: Session = Depends(get_db)):
            # Use db for database operations
            pass
    """
    db_manager = get_database_manager()

    # Use DatabaseManager's context manager for proper session lifecycle
    with db_manager.get_session() as db:
        try:
            yield db
        except SQLAlchemyError as e:
            logger.error(f"Database session error: {str(e)}")
            # Session will be automatically rolled back and closed by context manager
            raise
        except Exception as e:
            logger.error(f"Unexpected error in database session: {str(e)}")
            # Session will be automatically rolled back and closed by context manager
            raise


# Additional convenience dependencies
def get_db_with_transaction() -> Generator[Session, None, None]:
    """
    Dependency that ensures database operations run in a transaction.
    Equivalent to get_db() but with explicit transaction semantics.
    """
    db_manager = get_database_manager()

    with db_manager.get_session() as db:
        try:
            # Begin transaction explicitly
            with db.begin():
                yield db
        except SQLAlchemyError as e:
            logger.error(f"Transaction error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected transaction error: {str(e)}")
            raise


def get_db_readonly() -> Generator[Session, None, None]:
    """
    Dependency for read-only database operations.
    Sets transaction isolation level for read-only operations.
    """
    db_manager = get_database_manager()

    with db_manager.get_session() as db:
        try:
            # Set read-only isolation level if supported
            db.execute(text("SET TRANSACTION READ ONLY"))
            yield db
        except SQLAlchemyError as e:
            logger.error(f"Read-only database session error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in read-only session: {str(e)}")
            raise


def get_current_project(
    db: Session = Depends(get_db),
    project_id: Optional[int] = None
) -> Project:
    """
    Dependency to get the current project.

    This function provides project context for operations that need it.
    In a real implementation, this would extract project information from
    authentication tokens, headers, or request parameters.

    Args:
        db: Database session
        project_id: Optional project ID from request

    Returns:
        Project: The current project

    Raises:
        ValueError: If no project is found or specified
    """
    # For now, return the first available project or create a default one
    # In a production system, this would be based on authentication/authorization
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            return project

    # Try to get any active project
    project = db.query(Project).first()
    if project:
        return project

    # Create a default project if none exists
    default_project = Project(
        name="Default Project",
        description="Auto-generated default project for test case generation",
        status="active"
    )
    db.add(default_project)
    db.commit()
    db.refresh(default_project)

    logger.info(f"Created default project with ID: {default_project.id}")
    return default_project