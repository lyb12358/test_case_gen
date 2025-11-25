"""
API endpoints for test point management system.
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
    TestPoint, TestPointStatus, BusinessType, Project,
    UnifiedTestCase, GenerationJob, JobStatus
)
from ..database.operations import DatabaseOperations
from ..services.name_validation_service import NameValidationService
from ..services.name_sync_service import NameSyncService
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
    TestPointStatusUpdate,
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

# Remove old local database manager - use unified dependency injection

# Create router
# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test-points", tags=["test-points"])




def validate_project_id(project_id: Optional[int], db: Session, use_default: bool = True) -> Project:
    """
    Validate that a project_id exists and return the project.
    If no project_id is provided and use_default is True, returns the default project.
    """
    if project_id is None:
        if use_default:
            try:
                # Simple query to get or create default project (ID=1)
                project = db.query(Project).filter(Project.id == 1).first()
                if project is None:
                    # Create default project if it doesn't exist
                    project = Project(
                        id=1,
                        name="Default Project",
                        description="Default project for test points",
                        is_active=True
                    )
                    db.add(project)
                    db.commit()
                    db.refresh(project)
                return project
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to get or create default project: {str(e)}"
                )
        else:
            return None

    try:
        project = db.query(Project).filter(Project.id == project_id).first()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error when retrieving project {project_id}: {str(e)}"
        )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail=f"Project with ID {project_id} not found"
        )
    return project


# Test point endpoints
@router.get("/", response_model=TestPointListResponse)
async def get_test_points(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    business_type: Optional[BusinessType] = Query(None),
    status: Optional[TestPointStatus] = Query(None),
    priority: Optional[str] = Query(None),
    generation_job_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db)
):
    """Get test points with pagination and filtering."""
    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)

    query = db.query(TestPoint).filter(TestPoint.project_id == project.id)

    # Apply filters
    if business_type:
        query = query.filter(TestPoint.business_type == business_type)
    if status:
        query = query.filter(TestPoint.status == status)
    if priority:
        query = query.filter(TestPoint.priority == priority)
    if generation_job_id:
        query = query.filter(TestPoint.generation_job_id == generation_job_id)
    if search:
        query = query.filter(
            TestPoint.title.contains(search) |
            TestPoint.description.contains(search) |
            TestPoint.test_point_id.contains(search)
        )

    # Count total
    total = query.count()

    # Use JOIN to solve N+1 query problem
    from sqlalchemy import func

    # Apply pagination
    offset = (page - 1) * size

    # Get test points with test case counts in one query
    test_points_with_counts = query.outerjoin(
        UnifiedTestCase,
        TestPoint.id == UnifiedTestCase.test_point_id
    ).group_by(
        TestPoint.id
    ).add_columns(
        func.count(UnifiedTestCase.id).label('test_case_count'),
        func.max(UnifiedTestCase.created_at).label('last_test_case_date')
    ).order_by(desc(TestPoint.updated_at)).offset(offset).limit(size).all()

    # Convert to summary format
    items = []
    for test_point, test_case_count, last_test_case_date in test_points_with_counts:
        items.append(TestPointSummary(
            id=test_point.id,
            project_id=test_point.project_id,
            business_type=test_point.business_type.value,
            test_point_id=test_point.test_point_id,
            title=test_point.title,
            description=test_point.description,
            priority=test_point.priority,
            status=test_point.status.value,
            created_at=test_point.created_at,
            updated_at=test_point.updated_at,
            test_case_count=test_case_count or 0,
            last_test_case_date=last_test_case_date
        ))

    total_pages = (total + size - 1) // size

    return TestPointListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=total_pages
    )


@router.get("/statistics", response_model=TestPointStatistics)
async def get_test_point_statistics_compatible(
    project_id: Optional[int] = Query(None, description="项目ID"),
    db: Session = Depends(get_db)
):
    """获取测试点统计信息（兼容性端点）"""
    try:
        return await get_test_point_statistics(project_id, db)
    except Exception as e:
        logger.error(f"获取测试点统计信息失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="获取统计信息失败，请稍后重试"
        )


@router.get("/by-business/{business_type}", response_model=TestPointListResponse)
async def get_test_points_by_business_type(
    business_type: str,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[TestPointStatus] = Query(None),
    priority: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db)
):
    """根据业务类型获取测试点列表"""
    try:
        # 构建查询条件
        query = db.query(TestPoint).filter(TestPoint.business_type == business_type)

        # 添加过滤条件
        if project_id is not None:
            query = query.filter(TestPoint.project_id == project_id)
        if status is not None:
            query = query.filter(TestPoint.status == status)
        if priority is not None:
            query = query.filter(TestPoint.priority == priority)

        # 获取总数
        total = query.count()

        # 分页查询
        test_points = query.offset((page - 1) * size).limit(size).all()

        # 解析JSON字段并构建响应
        test_point_list = []
        for tp in test_points:
            try:
                # 安全解析JSON字段
                preconditions = []
                if tp.preconditions:
                    try:
                        preconditions = json.loads(tp.preconditions) if isinstance(tp.preconditions, str) else tp.preconditions
                    except (json.JSONDecodeError, TypeError):
                        preconditions = []

                steps = []
                if tp.steps:
                    try:
                        steps = json.loads(tp.steps) if isinstance(tp.steps, str) else tp.steps
                    except (json.JSONDecodeError, TypeError):
                        steps = []

                expected_result = []
                if tp.expected_result:
                    try:
                        expected_result = json.loads(tp.expected_result) if isinstance(tp.expected_result, str) else tp.expected_result
                    except (json.JSONDecodeError, TypeError):
                        expected_result = []

                test_point_list.append({
                    "id": tp.id,
                    "test_point_id": tp.test_point_id,
                    "title": tp.title,
                    "description": tp.description,
                    "business_type": tp.business_type,
                    "priority": tp.priority,
                    "status": tp.status,
                    "preconditions": preconditions,
                    "steps": steps,
                    "expected_result": expected_result,
                    "test_case_count": tp.test_case_count or 0,
                    "project_id": tp.project_id,
                    "created_at": tp.created_at.isoformat() if tp.created_at else None,
                    "updated_at": tp.updated_at.isoformat() if tp.updated_at else None
                })
            except Exception as e:
                logger.warning(f"解析测试点数据失败 (ID: {tp.id}): {str(e)}")
                continue

        total_pages = (total + size - 1) // size

        return TestPointListResponse(
            items=test_point_list,
            total=total,
            page=page,
            size=size,
            pages=total_pages
        )

    except Exception as e:
        logger.error(f"根据业务类型获取测试点失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="获取测试点列表失败，请稍后重试"
        )


@router.get("/{test_point_id}", response_model=TestPointSchema)
async def get_test_point(test_point_id: int, db: Session = Depends(get_db)):
    """Get a specific test point by ID."""
    test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()
    if not test_point:
        raise HTTPException(status_code=404, detail="指定的测试点不存在")

    # Parse JSON fields with error handling
    llm_metadata = None
    if test_point.llm_metadata:
        try:
            llm_metadata = json.loads(test_point.llm_metadata)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to parse llm_metadata for test point {test_point.id}: {e}")
            llm_metadata = None

    return TestPointSchema(
        id=test_point.id,
        project_id=test_point.project_id,
        business_type=test_point.business_type.value,
        test_point_id=test_point.test_point_id,
        title=test_point.title,
        description=test_point.description,
        priority=test_point.priority,
        status=test_point.status.value,
        generation_job_id=test_point.generation_job_id,
        llm_metadata=llm_metadata,
        created_at=test_point.created_at,
        updated_at=test_point.updated_at
    )


@router.post("/", response_model=TestPointSchema)
async def create_test_point(
    test_point: TestPointCreate,
    project_id: Optional[int] = Query(None, description="Project ID for the test point"),
    db: Session = Depends(get_db)
):
    """Create a new test point."""
    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)

    # Validate that the project exists
    project = db.query(Project).filter(Project.id == test_point.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="指定的项目不存在")

    # Check if test point ID already exists in the same project
    existing = db.query(TestPoint).filter(
        TestPoint.project_id == test_point.project_id,
        TestPoint.test_point_id == test_point.test_point_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="测试点ID在此项目中已存在")

    # Convert lists and dicts to JSON
    llm_metadata_json = json.dumps(test_point.llm_metadata, ensure_ascii=False) if test_point.llm_metadata else None

    db_test_point = TestPoint(
        project_id=test_point.project_id,
        business_type=test_point.business_type,
        test_point_id=test_point.test_point_id,
        title=test_point.title,
        description=test_point.description,
        priority=test_point.priority,
        status=test_point.status,
        generation_job_id=test_point.generation_job_id,
        llm_metadata=llm_metadata_json
    )

    db.add(db_test_point)
    db.commit()
    db.refresh(db_test_point)

    # Return the created test point
    return await get_test_point(db_test_point.id, db)


@router.put("/{test_point_id}", response_model=TestPointSchema)
async def update_test_point(
    test_point_id: int,
    test_point_update: TestPointUpdate,
    db: Session = Depends(get_db)
):
    """Update a test point."""
    test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()
    if not test_point:
        raise HTTPException(status_code=404, detail="指定的测试点不存在")

    # Get business type for name validation
    business_type = test_point.business_type.value if test_point.business_type else None

    # Validate name uniqueness if title is being updated
    update_data = test_point_update.dict(exclude_unset=True)
    if 'title' in update_data and update_data['title'] != test_point.title:
        # Initialize name validation service
        config = Config()
        db_manager = DatabaseManager(config)
        name_validator = NameValidationService(db_manager)

        # Validate new title
        is_valid, error_msg, conflict_info = name_validator.validate_test_point_name_uniqueness(
            business_type, update_data['title'], exclude_id=test_point_id
        )

        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "name_duplicate",
                    "message": error_msg,
                    "conflict_info": conflict_info
                }
            )

    # Update fields
    for field, value in update_data.items():
        if field == "llm_metadata" and value is not None:
            # Convert dicts/lists to JSON
            setattr(test_point, field, json.dumps(value, ensure_ascii=False))
        else:
            setattr(test_point, field, value)

    # Update timestamp
    test_point.updated_at = datetime.now()

    db.commit()
    db.refresh(test_point)

    # Handle name synchronization if title was changed
    sync_result = None
    if 'title' in update_data and update_data['title'] != test_point.title:
        # Check if client requested sync
        sync_option = update_data.get('sync_test_cases', False)
        if sync_option:
            old_title = update_data.get('old_title', '')
            if old_title:
                # Initialize name sync service
                name_sync_service = NameSyncService(db_manager)

                sync_options = {
                    'auto_sync': True,
                    'resolve_conflicts': 'prompt',
                    'include_original': True
                }

                sync_result = name_sync_service.sync_test_point_name_to_test_cases(
                    test_point_id,
                    update_data['title'],
                    sync_options
                )

    response = await get_test_point(test_point_id, db)

    # Add sync result to response if available
    if sync_result:
        response_dict = response.dict()
        response_dict['sync_result'] = sync_result
        return response_dict

    return response


@router.post("/{test_point_id}/sync-test-case-names")
async def sync_test_case_names(
    test_point_id: int,
    sync_request: dict = None,
    db: Session = Depends(get_db)
):
    """
    Synchronize test case names when test point name changes.
    """
    if sync_request is None:
        sync_request = {}

    test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()
    if not test_point:
        raise HTTPException(status_code=404, detail="指定的测试点不存在")

    # Initialize name sync service
    config = Config()
    db_manager = DatabaseManager(config)
    name_sync_service = NameSyncService(db_manager)

    # Get sync options from request
    sync_options = {
        'auto_sync': sync_request.get('auto_sync', True),
        'resolve_conflicts': sync_request.get('resolve_conflicts', 'prompt'),
        'include_original': sync_request.get('include_original', True)
    }

    # Perform synchronization
    result = name_sync_service.sync_test_point_name_to_test_cases(
        test_point_id,
        test_point.title,
        sync_options
    )

    return {
        "test_point_id": test_point_id,
        "test_point_name": test_point.title,
        "sync_result": result,
        "sync_options": sync_options
    }


@router.post("/batch-sync-names")
async def batch_sync_names_alias(
    batch_request: dict,
    db: Session = Depends(get_db)
):
    """
    批量同步测试点名称别名端点 - 与 /batch-sync-test-case-names 功能相同
    为了兼容前端调用而添加的别名端点
    """
    return await batch_sync_test_case_names_impl(batch_request, db)


@router.post("/batch-sync-test-case-names")
async def batch_sync_test_case_names(
    batch_request: dict,
    db: Session = Depends(get_db)
):
    """
    Batch synchronize multiple test point name changes.
    """
    updates = batch_request.get('updates', [])
    sync_options = batch_request.get('sync_options', {
        'auto_sync': True,
        'resolve_conflicts': 'prompt',
        'include_original': True
    })

    if not updates:
        raise HTTPException(status_code=400, detail="没有提供更新数据")

    # Initialize name sync service
    config = Config()
    db_manager = DatabaseManager(config)
    name_sync_service = NameSyncService(db_manager)

    # Validate all test points exist
    test_point_ids = [update.get('test_point_id') for update in updates]
    existing_test_points = db.query(TestPoint).filter(TestPoint.id.in_(test_point_ids)).all()
    existing_ids = {tp.id for tp in existing_test_points}

    missing_ids = set(test_point_ids) - existing_ids
    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Test points not found: {list(missing_ids)}"
        )

    # Perform batch synchronization
    result = name_sync_service.sync_batch_test_point_names(updates, sync_options)

    return {
        "batch_result": result,
        "updates_processed": len(updates),
        "sync_options": sync_options
    }


@router.delete("/{test_point_id}", response_model=UnifiedTestCaseDeleteResponse)

async def delete_test_point(test_point_id: int, db: Session = Depends(get_db)):
    """Delete a test point."""
    test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()
    if not test_point:
        raise HTTPException(status_code=404, detail="指定的测试点不存在")

    # Check if test point has associated test cases
    test_case_count = db.query(UnifiedTestCase).filter(UnifiedTestCase.test_point_id == test_point_id).count()
    if test_case_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"该测试点下还有 {test_case_count} 个测试用例，无法删除。请先删除相关测试用例。"
        )

    db.delete(test_point)
    db.commit()
    return UnifiedTestCaseDeleteResponse(message="测试点删除成功")


# Status management endpoints
@router.put("/{test_point_id}/status", response_model=TestPointSchema)

async def update_test_point_status(
    test_point_id: int,
    status_update: TestPointStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update test point status."""
    test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()
    if not test_point:
        raise HTTPException(status_code=404, detail="指定的测试点不存在")

    # Update status
    test_point.status = status_update.status
    test_point.updated_at = datetime.now()

    db.commit()
    return await get_test_point(test_point_id, db)


# Batch operations implementation
async def batch_test_point_operation_impl(
    operation: BatchTestPointOperation,
    db: Session
) -> BatchTestPointOperationResponse:
    """批量操作测试点的具体实现"""
    if not operation.test_point_ids:
        raise HTTPException(status_code=400, detail="没有提供测试点ID列表")

    success_count = 0
    failed_count = 0
    errors = []

    for test_point_id in operation.test_point_ids:
        try:
            test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()
            if not test_point:
                failed_count += 1
                errors.append(f"Test point {test_point_id} not found")
                continue

            if operation.operation == "approve":
                test_point.status = TestPointStatus.APPROVED
            elif operation.operation == "archive":
                test_point.status = TestPointStatus.COMPLETED
            elif operation.operation == "delete":
                # Check for associated test cases
                test_case_count = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.test_point_id == test_point_id
                ).count()
                if test_case_count > 0:
                    failed_count += 1
                    errors.append(f"Test point {test_point_id} has {test_case_count} test cases, cannot delete")
                    continue
                db.delete(test_point)
            elif operation.operation == "reset_to_draft":
                test_point.status = TestPointStatus.DRAFT
            else:
                failed_count += 1
                errors.append(f"Unknown operation: {operation.operation}")
                continue

            if operation.operation != "delete":
                test_point.updated_at = datetime.now()

            success_count += 1

        except Exception as e:
            failed_count += 1
            errors.append(f"Error processing test point {test_point_id}: {str(e)}")

    db.commit()

    return BatchTestPointOperationResponse(
        success_count=success_count,
        failed_count=failed_count,
        errors=errors
    )


# Batch operations endpoints
@router.post("/batch", response_model=BatchTestPointOperationResponse)
async def batch_test_point_operation_alias(
    operation: BatchTestPointOperation,
    db: Session = Depends(get_db)
):
    """
    批量操作测试点 - 端点别名，与 /batch-operation 功能相同
    为了兼容前端调用而添加的别名端点
    """
    return await batch_test_point_operation_impl(operation, db)


@router.post("/batch-operation", response_model=BatchTestPointOperationResponse)
async def batch_test_point_operation(
    operation: BatchTestPointOperation,
    db: Session = Depends(get_db)
):
    """Perform batch operations on test points."""
    return await batch_test_point_operation_impl(operation, db)


# Search and validation endpoints
@router.post("/search", response_model=TestPointListResponse)

async def search_test_points(
    search_request: TestPointSearchRequest,
    db: Session = Depends(get_db)
):
    """Search test points with advanced filtering."""
    query = db.query(TestPoint)

    # Apply filters
    if search_request.query:
        query = query.filter(
            TestPoint.title.contains(search_request.query) |
            TestPoint.description.contains(search_request.query) |
            TestPoint.test_point_id.contains(search_request.query)
        )
    if search_request.business_type:
        query = query.filter(TestPoint.business_type == search_request.business_type)
    if search_request.status:
        query = query.filter(TestPoint.status == search_request.status)
    if search_request.priority:
        query = query.filter(TestPoint.priority == search_request.priority)
    if search_request.project_id:
        query = query.filter(TestPoint.project_id == search_request.project_id)
    if search_request.generation_job_id:
        query = query.filter(TestPoint.generation_job_id == search_request.generation_job_id)

    # Count total
    total = query.count()

    # Apply pagination
    offset = (search_request.page - 1) * search_request.size
    test_points = query.order_by(desc(TestPoint.updated_at)).offset(offset).limit(search_request.size).all()

    # Convert to summary format
    items = []
    for test_point in test_points:
        test_case_count = db.query(UnifiedTestCase).filter(
            UnifiedTestCase.test_point_id == test_point.id
        ).count()

        items.append(TestPointSummary(
            id=test_point.id,
            project_id=test_point.project_id,
            business_type=test_point.business_type.value,
            test_point_id=test_point.test_point_id,
            title=test_point.title,
            description=test_point.description,
            priority=test_point.priority,
            status=test_point.status.value,
            created_at=test_point.created_at,
            updated_at=test_point.updated_at,
            test_case_count=test_case_count
        ))

    total_pages = (total + search_request.size - 1) // search_request.size

    return TestPointListResponse(
        items=items,
        total=total,
        page=search_request.page,
        size=search_request.size,
        pages=total_pages
    )


@router.post("/{test_point_id}/validate", response_model=TestPointValidationResponse)

async def validate_test_point(test_point_id: int, db: Session = Depends(get_db)):
    """Validate a test point and provide suggestions."""
    test_point = db.query(TestPoint).filter(TestPoint.id == test_point_id).first()
    if not test_point:
        raise HTTPException(status_code=404, detail="指定的测试点不存在")

    errors = []
    warnings = []
    suggestions = []

    # Basic validation
    if not test_point.title.strip():
        errors.append("Test point title cannot be empty")

    if not test_point.test_point_id.strip():
        errors.append("Test point ID cannot be empty")

    if len(test_point.title) < 10:
        warnings.append("Test point title is very short")

    # Content validation
    if not test_point.description or len(test_point.description.strip()) < 20:
        warnings.append("Test point description is missing or very short")

    # Business type specific validation
    if test_point.business_type:
        # Check if there are any associated test cases
        test_case_count = db.query(UnifiedTestCase).filter(
            UnifiedTestCase.test_point_id == test_point.id
        ).count()

        if test_point.status == TestPointStatus.APPROVED and test_case_count == 0:
            suggestions.append("Approved test point should have associated test cases")

        if test_point.status == TestPointStatus.COMPLETED and test_case_count == 0:
            warnings.append("Completed test point has no associated test cases")

    return TestPointValidationResponse(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        suggestions=suggestions
    )


# Statistics endpoint
@router.get("/stats/overview", response_model=TestPointStatistics)

async def get_test_point_statistics(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get test point statistics overview for a specific project."""
    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)

    # Filter by project
    query = db.query(TestPoint).filter(TestPoint.project_id == project.id)

    total_test_points = query.count()
    draft_test_points = query.filter(TestPoint.status == TestPointStatus.DRAFT).count()
    approved_test_points = query.filter(TestPoint.status == TestPointStatus.APPROVED).count()
    modified_test_points = query.filter(TestPoint.status == TestPointStatus.MODIFIED).count()
    completed_test_points = query.filter(TestPoint.status == TestPointStatus.COMPLETED).count()

    test_points_by_business_type = query.with_entities(
        TestPoint.business_type, func.count(TestPoint.id)
    ).group_by(TestPoint.business_type).all()
    test_points_by_priority = query.with_entities(
        TestPoint.priority, func.count(TestPoint.id)
    ).group_by(TestPoint.priority).all()
    test_points_by_status = query.with_entities(
        TestPoint.status, func.count(TestPoint.id)
    ).group_by(TestPoint.status).all()

    # Recent activity
    recent_test_points = query.order_by(desc(TestPoint.updated_at)).limit(5).all()

    recent_activity = []
    for test_point in recent_test_points:
        test_case_count = db.query(UnifiedTestCase).filter(
            UnifiedTestCase.test_point_id == test_point.id
        ).count()

        recent_activity.append(TestPointSummary(
            id=test_point.id,
            project_id=test_point.project_id,
            business_type=test_point.business_type.value,
            test_point_id=test_point.test_point_id,
            title=test_point.title,
            description=test_point.description,
            priority=test_point.priority,
            status=test_point.status.value,
            created_at=test_point.created_at,
            updated_at=test_point.updated_at,
            test_case_count=test_case_count
        ))

    # Most recent
    most_recent = query.order_by(desc(TestPoint.updated_at)).limit(5).all()

    most_recent_test_points = []
    for test_point in most_recent:
        test_case_count = db.query(UnifiedTestCase).filter(
            UnifiedTestCase.test_point_id == test_point.id
        ).count()

        most_recent_test_points.append(TestPointSummary(
            id=test_point.id,
            project_id=test_point.project_id,
            business_type=test_point.business_type.value,
            test_point_id=test_point.test_point_id,
            title=test_point.title,
            description=test_point.description,
            priority=test_point.priority,
            status=test_point.status.value,
            created_at=test_point.created_at,
            updated_at=test_point.updated_at,
            test_case_count=test_case_count
        ))

    return TestPointStatistics(
        total_test_points=total_test_points,
        draft_test_points=draft_test_points,
        approved_test_points=approved_test_points,
        modified_test_points=modified_test_points,
        completed_test_points=completed_test_points,
        test_points_by_business_type={bt.value: count for bt, count in test_points_by_business_type},
        test_points_by_priority={priority: count for priority, count in test_points_by_priority},
        test_points_by_status={status.value: count for status, count in test_points_by_status},
        recent_activity=recent_activity,
        most_recent=most_recent_test_points
    )


# Test Case Generation Endpoints
@router.post("/generate-test-cases", response_model=TestPointGenerationResponse)

async def generate_test_cases_from_points(
    request: TestPointGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generate test cases from multiple test points."""
    # Validate test points exist
    test_points = db.query(TestPoint).filter(
        TestPoint.id.in_(request.test_point_ids)
    ).all()

    if len(test_points) != len(request.test_point_ids):
        found_ids = [tp.id for tp in test_points]
        missing_ids = set(request.test_point_ids) - set(found_ids)
        raise HTTPException(
            status_code=404,
            detail=f"Test points not found: {list(missing_ids)}"
        )

    # Generate unique task ID
    import uuid
    task_id = str(uuid.uuid4())

    # Start background task for generation
    background_tasks.add_task(
        _generate_test_cases_background,
        task_id=task_id,
        test_point_ids=request.test_point_ids,
        generation_config=request.generation_config or {},
        regenerate_existing=request.regenerate_existing
    )

    return TestPointGenerationResponse(
        task_id=task_id,
        message=f"Test case generation started for {len(request.test_point_ids)} test points",
        test_points_count=len(request.test_point_ids)
    )


@router.post("/generate-single-test-case", response_model=TestCaseFromTestPointResponse)

async def generate_single_test_case(
    request: TestCaseFromTestPointRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generate a single test case from a test point using LLM."""
    from ..utils.config import Config
    from ..core.test_case_generator import TestCaseGenerator

    # Validate test point exists
    test_point = db.query(TestPoint).filter(
        TestPoint.id == request.test_point_id
    ).first()

    if not test_point:
        raise HTTPException(
            status_code=404,
            detail=f"Test point with ID {request.test_point_id} not found"
        )

    try:
        # Initialize generator and config
        config = Config()
        generator = TestCaseGenerator(config)

        # Get business type from test point
        business_type = test_point.business_type.value if test_point.business_type else None

        # Create test point data for LLM
        test_point_data = {
            "test_points": [
                {
                    "test_point_id": test_point.test_point_id,
                    "title": test_point.title,
                    "description": test_point.description,
                    "priority": test_point.priority,  # priority is string, not enum
                    "business_type": business_type,
                    "status": test_point.status.value if test_point.status else None
                }
            ]
        }

        # Generate test case using LLM
        test_cases_result = generator.generate_test_cases_from_points(
            business_type, test_point_data
        )

        if test_cases_result is None:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate test case using LLM"
            )

        # Extract the first test case from the result
        test_cases = test_cases_result.get('test_cases', [])
        if not test_cases:
            raise HTTPException(
                status_code=500,
                detail="No test cases generated from LLM"
            )

        generated_case = test_cases[0]

        # Generate unique test case ID
        import uuid
        test_case_id = str(uuid.uuid4())

        # Build test case content from LLM response
        test_case_content = {
            "case_id": f"TC-{test_point.test_point_id}-{test_case_id[:8].upper()}",
            "description": generated_case.get("description", f"Test case for {test_point.title}"),
            "preconditions": generated_case.get("preconditions", []),
            "steps": generated_case.get("steps", [
                f"1. Prepare test environment for {test_point.title}",
                f"2. Execute test case based on test point {test_point.test_point_id}",
                f"3. Verify expected results"
            ]),
            "expected_result": generated_case.get("expected_result", "Test case execution successful"),
            "test_point": {
                "id": test_point.id,
                "title": test_point.title,
                "description": test_point.description,
                "business_type": test_point.business_type.value if test_point.business_type else None,
                "priority": test_point.priority,  # priority is string, not enum
                "status": test_point.status.value if test_point.status else None
            },
            "generation_config": request.generation_config or {}
        }

        generation_metadata = {
            "test_case_id": test_case_id,
            "test_point_id": request.test_point_id,
            "generation_timestamp": datetime.now().isoformat(),
            "generation_config": request.generation_config or {},
            "status": "generated",
            "llm_generated": True
        }

        return TestCaseFromTestPointResponse(
            test_case_id=test_case_id,
            test_case_content=test_case_content,
            generation_metadata=generation_metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating test case: {str(e)}"
        )


def _generate_test_cases_background(task_id: str, test_point_ids: List[int],
                                   generation_config: Dict[str, Any],
                                   regenerate_existing: bool):
    """Background task for generating test cases from test points using LLM."""
    import time
    import json
    import logging
    from ..utils.config import Config
    from ..core.test_case_generator import TestCaseGenerator
    from ..database.database import DatabaseManager
    from ..database.models import GenerationJob, JobStatus, TestPoint

    # Configure logger for background task
    logger = logging.getLogger(__name__)

    config = Config()
    generator = TestCaseGenerator(config)
    db_manager = DatabaseManager(config)

    try:
        # Update job status: Running
        with db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                job.current_step = 1
                job.step_description = "Loading test points from database..."
                db.commit()

        # Load test points from database
        with db_manager.get_session() as db:
            test_points = db.query(TestPoint).filter(
                TestPoint.id.in_(test_point_ids)
            ).all()

        if not test_points:
            raise RuntimeError("No test points found for the given IDs")

        # Group test points by business type for efficient processing
        test_points_by_business_type = {}
        for test_point in test_points:
            business_type = test_point.business_type.value
            if business_type not in test_points_by_business_type:
                test_points_by_business_type[business_type] = []
            test_points_by_business_type[business_type].append(test_point)

        all_generated_test_cases = []
        total_points = len(test_points)
        processed_points = 0

        # Process each business type group
        for business_type, points in test_points_by_business_type.items():
            # Create test point data for LLM
            test_point_data = {
                "test_points": [
                    {
                        "test_point_id": point.test_point_id,
                        "title": point.title,
                        "description": point.description,
                        "priority": point.priority,  # priority is string, not enum
                        "business_type": business_type,
                        "status": point.status.value if point.status else None
                    }
                    for point in points
                ]
            }

            # Generate test cases using LLM
            test_cases_result = generator.generate_test_cases_from_points(
                business_type, test_point_data
            )

            if test_cases_result and 'test_cases' in test_cases_result:
                generated_cases = test_cases_result['test_cases']

                # Associate each generated case with its test point
                for i, case in enumerate(generated_cases):
                    if i < len(points):
                        case['test_point_id'] = points[i].id
                        case['test_point_identifier'] = points[i].test_point_id

                all_generated_test_cases.extend(generated_cases)

            processed_points += len(points)

            # Update progress
            progress = int((processed_points / total_points) * 80)  # 80% for generation
            with db_manager.get_session() as db:
                job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
                if job:
                    job.current_step = 2
                    job.step_description = f"Generated test cases for {business_type} ({processed_points}/{total_points} test points processed)"
                    # Note: We can't directly update progress in task_progress dict from here
                    db.commit()

        # Save results to database
        with db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.result_data = json.dumps({
                    "generated_test_cases": all_generated_test_cases,
                    "test_points_processed": total_points,
                    "generation_config": generation_config
                }, ensure_ascii=False)
                job.current_step = 3
                job.step_description = f"Successfully generated {len(all_generated_test_cases)} test cases from {total_points} test points"
                db.commit()

    except Exception as e:
        # Update job status with error
        try:
            with db_manager.get_session() as db:
                job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
                if job:
                    job.status = JobStatus.FAILED
                    job.error_message = str(e)
                    job.step_description = f"Failed to generate test cases: {str(e)}"
                    db.commit()
        except Exception as commit_error:
            print(f"Failed to update job status: {commit_error}")

        print(f"Background test case generation failed: {str(e)}")
        import traceback
        traceback.print_exc()


# ============================================================================
# NEW TEST POINT GENERATION ENDPOINTS (Unified Two-Stage Generation)
# ============================================================================

# Pydantic models for new generation endpoints
from pydantic import BaseModel, Field

class TestPointGenerationRequest(BaseModel):
    """Request model for test point generation."""
    business_type: str = Field(..., description="Business type (e.g., RCC, RFD, ZAB, ZBA)")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional context for generation")
    save_to_database: bool = Field(False, description="Whether to save test points to database")
    project_id: Optional[int] = Field(None, description="Project ID for database saving")


class TestCaseFromPointsRequest(BaseModel):
    """Request model for generating test cases from test points."""
    business_type: str = Field(..., description="Business type")
    test_points_data: Dict[str, Any] = Field(..., description="Test points data")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional context for generation")
    save_to_database: bool = Field(False, description="Whether to save test cases to database")
    project_id: Optional[int] = Field(None, description="Project ID for database saving")

# Dependency to get test point generator
def get_test_point_generator():
    """Get test point generator instance."""
    from ..core.test_point_generator import TestPointGenerator
    from ..utils.config import Config
    return TestPointGenerator(Config())


@router.post("/batch/generate", response_model=Dict[str, Any])
async def generate_batch_test_points_new(
    request: BatchTestPointGenerationRequest,
    generator = Depends(get_test_point_generator)
):
    """
    Generate test points for multiple business types in batch.

    This endpoint processes multiple business types and returns
    individual results for each business type.
    """
    try:
        # Validate all business types first
        invalid_types = []
        for business_type in request.business_types:
            if not generator._validate_business_type(business_type):
                invalid_types.append(business_type)

        if invalid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid or inactive business types: {', '.join(invalid_types)}"
            )

        # Generate batch test points
        batch_results = generator.generate_batch_test_points(
            request.business_types,
            request.additional_context
        )

        # Save to database for successful generations if requested
        if request.save_to_database:
            for business_type, test_points_data in batch_results['successful'].items():
                # Save to database using generation service
                test_points_data['database_project_id'] = request.project_id

        return {
            "success": True,
            "summary": batch_results['summary'],
            "successful": batch_results['successful'],
            "failed": batch_results['failed'],
            "message": f"Batch generation completed for {len(request.business_types)} business types"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch test points generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/{business_type}/generate", response_model=Dict[str, Any])
async def generate_test_points_by_business_type_new(
    business_type: str,
    additional_context: Optional[Dict[str, Any]] = None,
    save_to_database: bool = False,
    project_id: Optional[int] = None,
    generator = Depends(get_test_point_generator)
):
    """
    Generate test points for a specific business type using path parameter.

    This is an alternative endpoint that uses path parameter for business type.
    """
    try:
        request = TestPointGenerationRequest(
            business_type=business_type,
            additional_context=additional_context,
            save_to_database=save_to_database,
            project_id=project_id
        )

        return await generate_test_points_new(request, generator)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating test points for {business_type}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/generation/statistics", response_model=Dict[str, Any])
async def get_test_points_generation_statistics(
    business_type: Optional[str] = None,
    generator = Depends(get_test_point_generator)
):
    """
    Get statistics about generated test points.

    Optional filter by business type.
    """
    try:
        # Validate business type if provided
        if business_type and not generator._validate_business_type(business_type):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid or inactive business type: {business_type}"
            )

        statistics = generator.get_test_points_statistics(business_type)

        return {
            "success": True,
            "statistics": statistics,
            "message": "Test points statistics retrieved successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting test points statistics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/generation/business-types", response_model=Dict[str, Any])
async def get_available_business_types_for_generation(generator = Depends(get_test_point_generator)):
    """
    Get list of available business types for test point generation.
    """
    try:
        with generator.db_manager.get_session() as db:
            from ..database.models import BusinessTypeConfig
            business_configs = db.query(BusinessTypeConfig).filter(
                BusinessTypeConfig.is_active == True
            ).all()

            business_types = [
                {
                    "code": config.code,
                    "name": config.name,
                    "description": config.description
                }
                for config in business_configs
            ]

            return {
                "success": True,
                "business_types": business_types,
                "count": len(business_types),
                "message": "Available business types retrieved successfully"
            }

    except Exception as e:
        logger.error(f"Error getting available business types: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/from-points/generate-test-cases", response_model=Dict[str, Any])
async def generate_test_cases_from_points_new(
    request: TestCaseFromPointsRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate test cases from externally provided test points.

    This endpoint represents the second stage of the two-generation process,
    taking test points as input and generating detailed test cases.
    """
    try:
        # Validate business type
        with get_test_point_generator().db_manager.get_session() as db:
            from ..database.models import BusinessTypeConfig
            business_config = db.query(BusinessTypeConfig).filter(
                BusinessTypeConfig.code == request.business_type.upper(),
                BusinessTypeConfig.is_active == True
            ).first()

            if not business_config:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid or inactive business type: {request.business_type}"
                )

        # Import TestCaseGenerator to use its new method
        from ..core.test_case_generator import TestCaseGenerator
        from ..utils.config import Config

        config = Config()
        test_case_generator = TestCaseGenerator(config)

        # Generate test cases from test points
        test_cases_data = test_case_generator.generate_test_cases_from_external_points(
            request.business_type,
            request.test_points_data,
            request.additional_context,
            request.save_to_database,
            request.project_id
        )

        if not test_cases_data:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate test cases from test points"
            )

        return {
            "success": True,
            "business_type": request.business_type,
            "test_cases": test_cases_data,
            "source_test_points_count": len(request.test_points_data.get('test_points', [])),
            "generated_test_cases_count": len(test_cases_data.get('test_cases', [])),
            "message": f"Successfully generated test cases from test points for {request.business_type}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating test cases from points: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/generate", response_model=Dict[str, Any])
async def generate_test_points_unified(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Unified endpoint for test point generation.

    This endpoint consolidates all test point generation functionality into a single,
    clean interface that supports both synchronous and asynchronous generation patterns.

    Args:
        request: Dictionary containing:
            - business_type (str, required): Business type code
            - additional_context (str, optional): Additional generation context
            - save_to_database (bool, optional): Whether to save results (default: false)
            - project_id (int, optional): Project ID for database storage
            - async_mode (bool, optional): Return task ID instead of results (default: false)
        db: Database session

    Returns:
        Dictionary containing either:
            - Sync mode: Generated test points data with metadata
            - Async mode: Task ID for tracking generation progress
    """
    try:
        business_type = request.get('business_type')
        additional_context = request.get('additional_context')
        save_to_database = request.get('save_to_database', False)
        project_id = request.get('project_id')

        if not business_type:
            raise HTTPException(
                status_code=400,
                detail="business_type is required"
            )

        # Import the core test point generator
        from ..core.test_point_generator import TestPointGenerator
        from ..utils.config import Config

        # Create test point generator instance
        config = Config()
        generator = TestPointGenerator(config)

        # Generate test points synchronously
        logger.info(f"Starting synchronous test point generation for {business_type}")

        test_points_data = generator.generate_test_points(
            business_type=business_type,
            additional_context=additional_context
        )

        if not test_points_data:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate test points for {business_type}"
            )

        # Save to database if requested
        saved_items = []
        if save_to_database and project_id:
            try:
                # Convert test points to database format and save
                for point_data in test_points_data.get('test_points', []):
                    test_point = TestPoint(
                        business_type=business_type,
                        name=point_data.get('name', ''),
                        description=point_data.get('description', ''),
                        priority=point_data.get('priority', 'MEDIUM'),
                        preconditions=point_data.get('preconditions', []),
                        project_id=project_id,
                        created_at=datetime.utcnow()
                    )
                    db.add(test_point)
                    saved_items.append({
                        'id': test_point.id,
                        'name': test_point.name
                    })

                db.commit()
                logger.info(f"Saved {len(saved_items)} test points to database")

            except Exception as e:
                db.rollback()
                logger.error(f"Failed to save test points to database: {str(e)}")
                # Continue without saving, but still return the generated data

        return {
            "success": True,
            "business_type": business_type,
            "test_points": test_points_data.get('test_points', []),
            "metadata": test_points_data.get('metadata', {}),
            "saved_items_count": len(saved_items),
            "message": f"Successfully generated {len(test_points_data.get('test_points', []))} test points for {business_type}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in sync test point generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

# Health check endpoint for generation service
@router.get("/generation/health", response_model=Dict[str, str])
async def generation_health_check():
    """Health check endpoint for test points generation API."""
    return {
        "status": "healthy",
        "service": "test-points-generation-api",
        "message": "Test points generation service is running"
    }