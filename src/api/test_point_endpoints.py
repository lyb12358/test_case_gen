"""
API endpoints for test point management system - Simplified version without status field.
"""

import json
import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from ..database.models import (
    TestPoint, BusinessType, Project,
    UnifiedTestCase, GenerationJob, JobStatus
)
from ..database.operations import DatabaseOperations
from ..services.name_validation_service import NameValidationService
from ..services.sync_transaction_manager import SyncTransactionManager
from ..database.database import DatabaseManager
from ..utils.config import Config

from ..models.test_point import (
    TestPoint as TestPointSchema,
    TestPointCreate,
    TestPointUpdate,
    TestPointSummary,
    TestPointListResponse,
    TestPointSearchRequest,
    TestPointValidationResponse,
    TestPointStatistics,
    TestPointGenerationRequest,
    TestPointGenerationResponse,
    TestCaseFromTestPointRequest,
    TestCaseFromTestPointResponse,
    BatchTestPointOperation,
    BatchTestPointOperationResponse,
    BatchTestPointGenerationRequest
)
from ..models.unified_test_case import UnifiedTestCaseDeleteResponse
from .dependencies import get_db

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/test-points", tags=["test-points"])

# Initialize managers and services
config = Config()
db_manager = DatabaseManager(config)
db_operations = DatabaseOperations(db_manager)
name_validator = NameValidationService(db_operations)


@router.get("/", response_model=TestPointListResponse)
async def get_test_points(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    business_type: Optional[BusinessType] = Query(None),
    priority: Optional[str] = Query(None),
    generation_job_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db)
):
    """Get test points with filtering and pagination."""
    try:
        # Start with base query
        query = db.query(TestPoint)

        # Apply filters
        if project_id:
            query = query.filter(TestPoint.project_id == project_id)

        if business_type:
            query = query.filter(TestPoint.business_type == business_type)

        if priority:
            query = query.filter(TestPoint.priority == priority)

        if generation_job_id:
            query = query.filter(TestPoint.generation_job_id == generation_job_id)

        if search:
            query = query.filter(
                TestPoint.title.contains(search) |
                TestPoint.description.contains(search)
            )

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * size
        test_points = query.order_by(desc(TestPoint.created_at)).offset(offset).limit(size).all()

        # Convert to response format
        items = []
        for test_point in test_points:
            # Get associated test case count
            test_case_count = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.test_point_id == test_point.id
            ).count()

            # Get last test case date
            last_test_case = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.test_point_id == test_point.id
            ).order_by(desc(UnifiedTestCase.created_at)).first()

            last_test_case_date = last_test_case.created_at if last_test_case else None

            items.append(TestPointSummary(
                id=test_point.id,
                project_id=test_point.project_id,
                business_type=test_point.business_type,
                test_point_id=test_point.test_point_id,
                title=test_point.title,
                description=test_point.description,
                priority=test_point.priority,
                created_at=test_point.created_at,
                updated_at=test_point.updated_at,
                test_case_count=test_case_count,
                last_test_case_date=last_test_case_date
            ))

        # Calculate pagination info
        pages = (total + size - 1) // size

        return TestPointListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages
        )

    except Exception as e:
        logger.error(f"Error fetching test points: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch test points")


@router.get("/{test_point_id}", response_model=TestPointSchema)
async def get_test_point(
    test_point_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific test point by ID."""
    try:
        test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()

        if not test_point:
            raise HTTPException(status_code=404, detail="Test point not found")

        # Get associated test case count
        test_case_count = db.query(UnifiedTestCase).filter(
            UnifiedTestCase.test_point_id == test_point.id
        ).count()

        return TestPointSchema(
            id=test_point.id,
            project_id=test_point.project_id,
            business_type=test_point.business_type,
            test_point_id=test_point.test_point_id,
            title=test_point.title,
            description=test_point.description,
            priority=test_point.priority,
            generation_job_id=test_point.generation_job_id,
            llm_metadata=json.loads(test_point.llm_metadata) if test_point.llm_metadata else None,
            created_at=test_point.created_at,
            updated_at=test_point.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching test point {test_point_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch test point")


@router.post("/", response_model=TestPointSchema)
async def create_test_point(
    test_point: TestPointCreate,
    db: Session = Depends(get_db)
):
    """Create a new test point."""
    try:
        logger.info(f"Creating test point: title='{test_point.title}', business_type='{test_point.business_type}', project_id={test_point.project_id}")

        # Defensive validation: ensure test_point_id exists
        test_point_id = test_point.test_point_id
        if not test_point_id or test_point_id.strip() == '':
            # Fallback auto-generation if Pydantic validator failed
            import time
            import random
            timestamp = int(time.time())
            random_suffix = random.randint(1000, 9999)
            test_point_id = f"TP-{timestamp}-{random_suffix}"
            logger.warning(f"Pydantic validator failed, generated fallback test_point_id: {test_point_id}")

        logger.info(f"Using test_point_id: {test_point_id}")

        # Validate required fields
        if not test_point.title or test_point.title.strip() == '':
            raise HTTPException(status_code=400, detail="Test point title is required")

        if not test_point.business_type or test_point.business_type.strip() == '':
            raise HTTPException(status_code=400, detail="Business type is required")

        if not test_point.project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")

        # Check for duplicate test_point_id in the same project
        existing = db.query(TestPoint).filter(
            TestPoint.project_id == test_point.project_id,
            TestPoint.test_point_id == test_point_id
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail=f"Test point ID '{test_point_id}' already exists in this project")

        # Check for business-scoped title uniqueness
        try:
            sync_manager = SyncTransactionManager(db)
            if not sync_manager.validate_business_uniqueness(
                business_type=test_point.business_type,
                name=test_point.title,
                entity_type='test_point'
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Test point title '{test_point.title}' already exists in business type '{test_point.business_type}'"
                )
        except Exception as sync_error:
            logger.error(f"Sync validation failed: {str(sync_error)}")
            # Continue with creation even if sync validation fails
            # Don't block creation for sync issues

        # Convert lists and dicts to JSON
        try:
            llm_metadata_json = json.dumps(test_point.llm_metadata, ensure_ascii=False) if test_point.llm_metadata else None
        except Exception as json_error:
            logger.error(f"JSON serialization error for llm_metadata: {str(json_error)}")
            llm_metadata_json = None

        # Create database record
        try:
            db_test_point = TestPoint(
                project_id=test_point.project_id,
                business_type=test_point.business_type,
                test_point_id=test_point_id,
                title=test_point.title.strip(),
                description=test_point.description.strip() if test_point.description else None,
                priority=test_point.priority,
                generation_job_id=test_point.generation_job_id,
                llm_metadata=llm_metadata_json
            )

            db.add(db_test_point)
            db.flush()  # Flush to get ID without committing
            logger.info(f"Test point created with ID: {db_test_point.id}")

            db.commit()
            db.refresh(db_test_point)
            logger.info(f"Test point committed successfully: {test_point_id}")

        except Exception as db_error:
            logger.error(f"Database error during test point creation: {str(db_error)}")
            db.rollback()
            if "Column 'test_point_id' cannot be null" in str(db_error):
                raise HTTPException(status_code=500, detail="Failed to generate test_point_id - please try again")
            elif "Duplicate entry" in str(db_error):
                raise HTTPException(status_code=400, detail=f"Test point with ID '{test_point_id}' already exists")
            else:
                raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")

        # Return the created test point
        return TestPointSchema(
            id=db_test_point.id,
            project_id=db_test_point.project_id,
            business_type=db_test_point.business_type,
            test_point_id=test_point_id,
            title=db_test_point.title,
            description=db_test_point.description,
            priority=db_test_point.priority,
            generation_job_id=db_test_point.generation_job_id,
            llm_metadata=test_point.llm_metadata,
            created_at=db_test_point.created_at,
            updated_at=db_test_point.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating test point: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create test point: {str(e)}")


@router.put("/{test_point_id}", response_model=TestPointSchema)
async def update_test_point(
    test_point_id: int,
    test_point_update: TestPointUpdate,
    db: Session = Depends(get_db)
):
    """Update a test point."""
    try:
        db_test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()

        if not db_test_point:
            raise HTTPException(status_code=404, detail="Test point not found")

        # Track if title is being updated for sync
        title_updated = False
        new_title = None

        # Update fields if provided
        if test_point_update.title is not None:
            # Check for business-scoped title uniqueness before updating
            from ..services.sync_transaction_manager import SyncTransactionManager
            sync_manager = SyncTransactionManager(db)
            if not sync_manager.validate_business_uniqueness(
                business_type=db_test_point.business_type,
                name=test_point_update.title,
                entity_type='test_point',
                exclude_id=db_test_point.id
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Test point title '{test_point_update.title}' already exists in business type '{db_test_point.business_type}'"
                )

            db_test_point.title = test_point_update.title
            title_updated = True
            new_title = test_point_update.title
        if test_point_update.description is not None:
            db_test_point.description = test_point_update.description
        if test_point_update.priority is not None:
            db_test_point.priority = test_point_update.priority
        if test_point_update.llm_metadata is not None:
            db_test_point.llm_metadata = json.dumps(test_point_update.llm_metadata, ensure_ascii=False)

        db_test_point.updated_at = datetime.now()

        # Sync name to test case if title was updated, within the same transaction
        if title_updated:
            from ..services.sync_transaction_manager import SyncTransactionManager
            sync_manager = SyncTransactionManager(db)
            sync_success = sync_manager.sync_names_within_transaction(
                source_type='test_point',
                source_id=test_point_id,
                new_name=new_title
            )
            if not sync_success:
                logger.warning(f"Name sync failed for test point {test_point_id}, but update proceeded")

        db.commit()

        db.refresh(db_test_point)

        # Return updated test point
        return TestPointSchema(
            id=db_test_point.id,
            project_id=db_test_point.project_id,
            business_type=db_test_point.business_type,
            test_point_id=db_test_point.test_point_id,
            title=db_test_point.title,
            description=db_test_point.description,
            priority=db_test_point.priority,
            generation_job_id=db_test_point.generation_job_id,
            llm_metadata=json.loads(db_test_point.llm_metadata) if db_test_point.llm_metadata else None,
            created_at=db_test_point.created_at,
            updated_at=db_test_point.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating test point {test_point_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update test point")


@router.delete("/{test_point_id}")
async def delete_test_point(
    test_point_id: int,
    db: Session = Depends(get_db)
):
    """Delete a test point."""
    try:
        db_test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()

        if not db_test_point:
            raise HTTPException(status_code=404, detail="Test point not found")

        # Check for associated test cases
        test_case_count = db.query(UnifiedTestCase).filter(
            UnifiedTestCase.test_point_id == test_point_id
        ).count()

        if test_case_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete test point with {test_case_count} associated test cases"
            )

        db.delete(db_test_point)
        db.commit()

        return {"message": "Test point deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting test point {test_point_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete test point")


@router.post("/batch-operation", response_model=BatchTestPointOperationResponse)
async def batch_test_point_operation(
    operation: BatchTestPointOperation,
    db: Session = Depends(get_db)
):
    """Perform batch operations on test points."""
    try:
        if not operation.test_point_ids:
            raise HTTPException(status_code=400, detail="No test point IDs provided")

        success_count = 0
        failed_count = 0
        errors = []

        for test_point_id in operation.test_point_ids:
            try:
                test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()

                if not test_point:
                    errors.append(f"Test point {test_point_id} not found")
                    failed_count += 1
                    continue

                if operation.operation == "delete":
                    # Check for associated test cases
                    test_case_count = db.query(UnifiedTestCase).filter(
                        UnifiedTestCase.test_point_id == test_point_id
                    ).count()

                    if test_case_count > 0:
                        errors.append(f"Test point {test_point_id} has {test_case_count} test cases, cannot delete")
                        failed_count += 1
                        continue

                    db.delete(test_point)
                    success_count += 1

                else:
                    failed_count += 1
                    errors.append(f"Unknown operation: {operation.operation}")
                    continue

            except Exception as e:
                failed_count += 1
                errors.append(f"Error processing test point {test_point_id}: {str(e)}")
                continue

        if success_count > 0:
            db.commit()

        return BatchTestPointOperationResponse(
            success_count=success_count,
            failed_count=failed_count,
            errors=errors
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch operation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to perform batch operation")


@router.get("/statistics", response_model=TestPointStatistics)
async def get_test_point_statistics(
    project_id: int,
    db: Session = Depends(get_db)
):
    """Get test point statistics for a project."""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Filter by project
        query = db.query(TestPoint).filter(TestPoint.project_id == project.id)

        total_test_points = query.count()

        test_points_by_business_type = query.with_entities(
            TestPoint.business_type, func.count(TestPoint.id)
        ).group_by(TestPoint.business_type).all()

        test_points_by_priority = query.with_entities(
            TestPoint.priority, func.count(TestPoint.id)
        ).group_by(TestPoint.priority).all()

        # Get recent activity
        recent_test_points = query.order_by(desc(TestPoint.updated_at)).limit(10).all()

        return TestPointStatistics(
            total_test_points=total_test_points,
            draft_test_points=0,  # No status field anymore
            approved_test_points=0,
            modified_test_points=0,
            completed_test_points=0,
            test_points_by_business_type={bt: count for bt, count in test_points_by_business_type},
            test_points_by_priority={priority: count for priority, count in test_points_by_priority},
            test_points_by_status={},  # Empty since no status field
            recent_activity=[
                TestPointSummary(
                    id=tp.id,
                    project_id=tp.project_id,
                    business_type=tp.business_type,
                    test_point_id=tp.test_point_id,
                    title=tp.title,
                    description=tp.description,
                    priority=tp.priority,
                    created_at=tp.created_at,
                    updated_at=tp.updated_at,
                    test_case_count=0,
                    last_test_case_date=None
                ) for tp in recent_test_points
            ],
            most_recent=[
                TestPointSummary(
                    id=tp.id,
                    project_id=tp.project_id,
                    business_type=tp.business_type,
                    test_point_id=tp.test_point_id,
                    title=tp.title,
                    description=tp.description,
                    priority=tp.priority,
                    created_at=tp.created_at,
                    updated_at=tp.updated_at,
                    test_case_count=0,
                    last_test_case_date=None
                ) for tp in recent_test_points[:5]
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")