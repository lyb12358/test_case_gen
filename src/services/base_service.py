"""
Base service class for common CRUD operations.
Provides standardized patterns for database operations and error handling.
"""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Dict, Any, Optional, List, Type
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from fastapi import HTTPException, status

from src.database.models import Base

ModelT = TypeVar('ModelT', bound=Base)


class BaseService(Generic[ModelT], ABC):
    """
    Base service class providing common CRUD operations.
    All service classes should inherit from this to ensure consistency.
    """

    def __init__(self, db: Session, model_class: Type[ModelT]):
        """
        Initialize service with database session and model class.

        Args:
            db: Database session
            model_class: SQLAlchemy model class
        """
        self.db = db
        self.model_class = model_class

    def create(self, **kwargs) -> ModelT:
        """
        Create a new record.

        Args:
            **kwargs: Field values for the new record

        Returns:
            Created record

        Raises:
            HTTPException: If creation fails
        """
        try:
            instance = self.model_class(**kwargs)
            self.db.add(instance)
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"数据完整性错误: {str(e)}"
            )
        except SQLAlchemyError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"数据库错误: {str(e)}"
            )

    def get_by_id(self, record_id: int) -> Optional[ModelT]:
        """
        Get a record by ID.

        Args:
            record_id: Record ID

        Returns:
            Record if found, None otherwise
        """
        return self.db.query(self.model_class).filter(
            self.model_class.id == record_id
        ).first()

    def get_by_id_or_404(self, record_id: int) -> ModelT:
        """
        Get a record by ID, raise 404 if not found.

        Args:
            record_id: Record ID

        Returns:
            Record

        Raises:
            HTTPException: If record not found
        """
        record = self.get_by_id(record_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{self.model_class.__name__} 不存在"
            )
        return record

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        **filters
    ) -> List[ModelT]:
        """
        Get all records with optional filtering and pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            **filters: Field filters

        Returns:
            List of records
        """
        query = self.db.query(self.model_class)

        # Apply filters
        for field, value in filters.items():
            if hasattr(self.model_class, field) and value is not None:
                query = query.filter(getattr(self.model_class, field) == value)

        # Apply default sorting by updated_at in descending order if the field exists
        if hasattr(self.model_class, 'updated_at'):
            query = query.order_by(getattr(self.model_class, 'updated_at').desc())

        return query.offset(skip).limit(limit).all()

    def update(self, record_id: int, **kwargs) -> ModelT:
        """
        Update a record.

        Args:
            record_id: Record ID
            **kwargs: Field values to update

        Returns:
            Updated record

        Raises:
            HTTPException: If update fails
        """
        try:
            instance = self.get_by_id_or_404(record_id)

            # Update fields
            for field, value in kwargs.items():
                if hasattr(instance, field):
                    setattr(instance, field, value)

            self.db.commit()
            self.db.refresh(instance)
            return instance
        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"数据完整性错误: {str(e)}"
            )
        except SQLAlchemyError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"数据库错误: {str(e)}"
            )

    def delete(self, record_id: int) -> bool:
        """
        Delete a record.

        Args:
            record_id: Record ID

        Returns:
            True if deleted successfully

        Raises:
            HTTPException: If deletion fails
        """
        try:
            instance = self.get_by_id_or_404(record_id)
            self.db.delete(instance)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"数据库错误: {str(e)}"
            )

    def count(self, **filters) -> int:
        """
        Count records with optional filters.

        Args:
            **filters: Field filters

        Returns:
            Number of matching records
        """
        query = self.db.query(self.model_class)

        # Apply filters
        for field, value in filters.items():
            if hasattr(self.model_class, field) and value is not None:
                query = query.filter(getattr(self.model_class, field) == value)

        return query.count()

    def exists(self, **filters) -> bool:
        """
        Check if a record exists with given filters.

        Args:
            **filters: Field filters

        Returns:
            True if record exists
        """
        return self.count(**filters) > 0

    def validate_unique(self, exclude_id: Optional[int] = None, **fields) -> None:
        """
        Validate that no record exists with given field combinations.

        Args:
            exclude_id: ID to exclude from check (for updates)
            **fields: Fields to check for uniqueness

        Raises:
            HTTPException: If duplicate record found
        """
        query = self.db.query(self.model_class)

        # Apply field filters
        for field, value in fields.items():
            if hasattr(self.model_class, field):
                query = query.filter(getattr(self.model_class, field) == value)

        # Exclude specific ID (for updates)
        if exclude_id:
            query = query.filter(self.model_class.id != exclude_id)

        if query.count() > 0:
            field_names = "、".join(fields.keys())
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"具有相同 {field_names} 的记录已存在"
            )

    def bulk_create(self, items: List[Dict[str, Any]]) -> List[ModelT]:
        """
        Create multiple records in bulk.

        Args:
            items: List of field dictionaries

        Returns:
            List of created records

        Raises:
            HTTPException: If bulk creation fails
        """
        try:
            instances = [self.model_class(**item) for item in items]
            self.db.add_all(instances)
            self.db.commit()

            # Refresh all instances to get their IDs
            for instance in instances:
                self.db.refresh(instance)

            return instances
        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"数据完整性错误: {str(e)}"
            )
        except SQLAlchemyError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"数据库错误: {str(e)}"
            )