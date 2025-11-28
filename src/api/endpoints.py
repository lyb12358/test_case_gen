# -*- coding: utf-8 -*-
"""
API endpoints for test case generation service using FastAPI.
Refactored to support business type parameters and database integration.
"""

# 导入编码配置以确保中文支持
from ..utils.encoding_config import setup_encoding_environment

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uuid
from .dependencies import get_db
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Annotated
import asyncio
import uuid
import os
import json
import io
import logging
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.test_case_generator import TestCaseGenerator
from ..utils.config import Config
from ..database.database import DatabaseManager
from ..database.operations import DatabaseOperations
from ..database.models import BusinessType, JobStatus, EntityType, BusinessTypeConfig, Project, GenerationJob, UnifiedTestCaseStatus
from ..core.business_data_extractor import BusinessDataExtractor
from ..core.excel_converter import ExcelConverter
from ..models.test_case import TestCase
from ..models.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse, ProjectStats, ProjectStatsResponse
from ..models.test_point import (
    TestPoint, TestPointCreate, TestPointUpdate,
    BatchTestCaseGenerationRequest, BatchTestPointGenerationRequest, BatchGenerationResponse
)
from .dependencies import get_db, get_current_project
from .prompt_endpoints import router as prompt_router
from .config_endpoints import router as config_router
from .business_endpoints import router as business_router
from .test_point_endpoints import router as test_point_router
from .generation_endpoints import router as generation_router
from .unified_test_case_endpoints import router as unified_test_case_router
from ..middleware.error_handler import setup_error_handler
from ..websocket.endpoints import router as websocket_router


class RequestIDMiddleware(BaseHTTPMiddleware):
    """请求ID中间件，为每个请求添加唯一标识符。"""

    async def dispatch(self, request: Request, call_next):
        # 生成请求ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # 添加响应头
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        return response

# Configure logging
logger = logging.getLogger(__name__)

# 设置编码环境以确保中文支持
setup_encoding_environment()

# 初始化数据库管理器和配置
config = Config()
db_manager = DatabaseManager(config)

# Create main router for core endpoints
main_router = APIRouter(
    prefix="/api/v1",
    tags=["core"],
    include_in_schema=True
)


class GenerateTestCaseRequest(BaseModel):
    """Request model for generating test cases."""
    business_type: str  # RCC, RFD, ZAB, ZBA


class GenerateResponse(BaseModel):
    """Response model for generation requests."""
    task_id: str
    status: str
    message: str


class TaskStatusResponse(BaseModel):
    """Response model for task status."""
    task_id: str
    status: str
    progress: Optional[int] = None
    project_id: int
    project_name: Optional[str] = None
    business_type: Optional[str] = None
    error: Optional[str] = None
    test_case_id: Optional[int] = None


class UnifiedTestCaseResponse(BaseModel):
    """Response model for individual test case item."""
    id: int
    project_id: int
    test_case_id: str
    name: str
    description: Optional[str] = None
    module: Optional[str] = None
    functional_module: Optional[str] = None
    functional_domain: Optional[str] = None
    preconditions: List[str] = []
    steps: List[str] = []
    expected_result: List[str] = []
    remarks: Optional[str] = None
    entity_order: Optional[float] = None
    created_at: str


class TestCaseGroupResponse(BaseModel):
    """Response model for test case group."""
    id: int
    project_id: int
    project_name: Optional[str] = None
    business_type: str
    generation_metadata: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: Optional[str] = None
    test_case_items: List[UnifiedTestCaseResponse] = []


class TestCasesListResponse(BaseModel):
    """Response model for list of test cases."""
    business_type: Optional[str] = None
    count: int
    projects: List[TestCaseGroupResponse]


class BusinessTypeResponse(BaseModel):
    """Response model for business types."""
    business_types: List[str]


class BusinessTypeMappingResponse(BaseModel):
    """Response model for business type mapping with names and descriptions."""
    business_types: Dict[str, Dict[str, str]]


class GraphNode(BaseModel):
    """Graph node model for knowledge graph."""
    id: str
    name: str
    label: str
    type: str
    description: Optional[str] = None
    businessType: Optional[str] = None


class GraphEdge(BaseModel):
    """Graph edge model for knowledge graph."""
    source: str
    target: str
    label: str
    type: str
    businessType: Optional[str] = None


class KnowledgeGraphResponse(BaseModel):
    """Response model for knowledge graph data."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class GraphStatsResponse(BaseModel):
    """Response model for graph statistics."""
    total_entities: int
    total_relations: int
    scenario_entities: int
    business_entities: int
    interface_entities: int
    test_case_entities: int


class EntityDetailsResponse(BaseModel):
    """Response model for entity details."""
    id: int
    name: str
    type: str
    description: Optional[str] = None
    business_type: Optional[str] = None
    parent_id: Optional[int] = None
    entity_order: Optional[float] = None
    extra_data: Optional[str] = None
    created_at: str
    children: Optional[List['EntityDetailsResponse']] = None
    business_description: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None


class BusinessDescriptionResponse(BaseModel):
    """Response model for business description."""
    entity_id: int
    entity_name: str
    full_description: str
    business_code: str


class EntityTestCasesResponse(BaseModel):
    """Response model for entity test cases."""
    entity_id: int
    entity_name: str
    test_cases: List[Dict[str, Any]]


class GraphEntityResponse(BaseModel):
    """Response model for graph entities."""
    id: int
    name: str
    type: str
    description: Optional[str] = None
    business_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str


class GraphRelationResponse(BaseModel):
    """Response model for graph relations."""
    id: int
    subject: str
    predicate: str
    object: str
    business_type: Optional[str] = None
    created_at: str


# Two-stage generation models
class GenerateTestCasesFromPointsRequest(BaseModel):
    """Request model for generating test cases from test points."""
    business_type: str
    test_points: Dict[str, Any]


class SetBusinessTypeConfigRequest(BaseModel):
    """Request model for setting business type configuration."""
    test_point_combination_id: Optional[int] = None  # For test_point
    test_case_combination_id: Optional[int] = None  # For test_case


# Utility functions for project validation
def validate_project_id(project_id: Optional[int], db: Session, use_default: bool = True) -> Project:
    """
    Validate that a project_id exists and return the project.
    If no project_id is provided and use_default is True, returns the default project.

    Args:
        project_id (Optional[int]): Project ID to validate
        db (Session): Database session
        use_default (bool): Whether to use default project when project_id is None

    Returns:
        Project: Valid project (either specified or default)

    Raises:
        HTTPException: If project_id is provided but project doesn't exist
    """
    db_operations = DatabaseOperations(db)

    if project_id is None:
        if use_default:
            # Get or create default project for backward compatibility
            return db_operations.get_or_create_default_project()
        else:
            return None

    project = db_operations.get_project(project_id)
    if project is None:
        raise HTTPException(
            status_code=404,
            detail=f"Project with ID {project_id} not found"
        )
    return project


def get_database_session():
    """Get database session for dependency injection."""
    return Depends(get_db)


# OpenAPI tags for endpoint organization
tags_metadata = [
    {
        "name": "projects",
        "description": "Project management operations. Create, read, update, and delete projects for organizing test cases by business scenarios."
    },
    {
        "name": "test-cases",
        "description": "Test case generation and management operations. Generate, retrieve, export, and manage test cases within projects."
    },
    {
        "name": "knowledge-graph",
        "description": "Knowledge graph operations for visualizing business relationships and test coverage."
    },
    {
        "name": "tasks",
        "description": "Background task management for monitoring test case generation progress."
    },
    {
        "name": "business-types",
        "description": "Business type definitions and mappings for the 29 TSP remote control services."
    }
]

# Initialize FastAPI app
app = FastAPI(
    title="TSP Test Case Generator API",
    description="API for generating test cases using LLMs with project-based hierarchical management and business type support",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=tags_metadata
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup request ID middleware for better tracking
app.add_middleware(RequestIDMiddleware)

# Setup error handling middleware
setup_error_handler(app)

# Configuration
config = Config()

# Router registration will be done at the end of the file
# after all function definitions have been processed


# Task progress data (for additional metadata during execution)
task_progress: Dict[str, Dict[str, Any]] = {}


@main_router.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "TSP Test Case Generator API v2.0",
        "description": "API for generating test cases using LLMs with business type support and knowledge graph",
        "endpoints": [
            "POST /generate-test-cases - Generate test cases for business type",
            "GET /test-cases/{business_type} - Get test cases by business type",
            "GET /test-cases - Get all test cases",
            "DELETE /test-cases/{business_type} - Delete test cases by business type",
            "GET /test-cases/export - Export test cases to Excel file",
            "GET /business-types - List supported business types",
            "GET /business-types/mapping - Get business type mapping with names and descriptions",
            "GET /knowledge-graph/data - Get knowledge graph data for visualization",
            "GET /knowledge-graph/entities - Get knowledge graph entities",
            "GET /knowledge-graph/relations - Get knowledge graph relations",
            "GET /knowledge-graph/stats - Get knowledge graph statistics",
            "POST /knowledge-graph/initialize - Initialize knowledge graph from business descriptions",
            "DELETE /knowledge-graph/clear - Clear all knowledge graph data",
            "GET /projects - Get all projects",
            "POST /projects - Create new project",
            "GET /projects/{project_id} - Get project details",
            "PUT /projects/{project_id} - Update project",
            "DELETE /projects/{project_id} - Delete project",
            "GET /projects/{project_id}/stats - Get project statistics"
        ]
    }


# Project Management Endpoints
@main_router.get("/projects", response_model=ProjectListResponse, tags=["projects"])
async def get_projects(active_only: bool = True, db = Depends(get_db)):
    """
    Get all projects.

    Args:
        active_only (bool): Whether to only return active projects
        db (Session): Database session

    Returns:
        ProjectListResponse: List of projects
    """
    db_ops = DatabaseOperations(db)
    projects = db_ops.get_all_projects(active_only=active_only)

    project_responses = [
        ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            is_active=project.is_active,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat()
        )
        for project in projects
    ]

    return ProjectListResponse(
        projects=project_responses,
        total=len(project_responses)
    )


@main_router.post("/projects", response_model=ProjectResponse, tags=["projects"])
async def create_project(project_data: ProjectCreate, db = Depends(get_db)):
    """
    Create a new project.

    Args:
        project_data (ProjectCreate): Project creation data
        db (Session): Database session

    Returns:
        ProjectResponse: Created project
    """
    db_ops = DatabaseOperations(db)

    # Check if project name already exists
    existing_project = db_ops.get_project_by_name(project_data.name)
    if existing_project:
        raise HTTPException(status_code=400, detail=f"Project with name '{project_data.name}' already exists")

    project = db_ops.create_project(
        name=project_data.name,
        description=project_data.description,
        is_active=project_data.is_active
    )

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        is_active=project.is_active,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat()
    )


@main_router.get("/projects/{project_id}", response_model=ProjectResponse, tags=["projects"])
async def get_project(project_id: int, db = Depends(get_db)):
    """
    Get project details.

    Args:
        project_id (int): Project ID
        db (Session): Database session

    Returns:
        ProjectResponse: Project details
    """
    db_ops = DatabaseOperations(db)
    project = db_ops.get_project(project_id)

    if not project:
        raise HTTPException(status_code=404, detail=f"项目ID {project_id} 未找到")

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        is_active=project.is_active,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat()
    )


@main_router.put("/projects/{project_id}", response_model=ProjectResponse, tags=["projects"])
async def update_project(project_id: int, project_data: ProjectUpdate, db = Depends(get_db)):
    """
    Update a project.

    Args:
        project_id (int): Project ID
        project_data (ProjectUpdate): Project update data
        db (Session): Database session

    Returns:
        ProjectResponse: Updated project
    """
    try:
        db_ops = DatabaseOperations(db)

        # Check if project exists
        existing_project = db_ops.get_project(project_id)
        if not existing_project:
            raise HTTPException(status_code=404, detail=f"项目ID {project_id} 未找到")

        # Check if new name conflicts with existing project
        if project_data.name and project_data.name != existing_project.name:
            name_conflict = db_ops.get_project_by_name(project_data.name)
            if name_conflict and name_conflict.id != project_id:
                raise HTTPException(status_code=400, detail=f"Project with name '{project_data.name}' already exists")

        # Update project with provided fields
        update_data = {}
        if project_data.name is not None:
            update_data['name'] = project_data.name
        if project_data.description is not None:
            update_data['description'] = project_data.description
        if project_data.is_active is not None:
            update_data['is_active'] = project_data.is_active

        updated_project = db_ops.update_project(project_id, **update_data)

        return ProjectResponse(
            id=updated_project.id,
            name=updated_project.name,
            description=updated_project.description,
            is_active=updated_project.is_active,
            created_at=updated_project.created_at,
            updated_at=updated_project.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")


@main_router.delete("/projects/{project_id}", tags=["projects"])
async def delete_project(project_id: int, soft_delete: bool = True, db = Depends(get_db)):
    """
    Delete a project.

    Args:
        project_id (int): Project ID
        soft_delete (bool): Whether to soft delete (deactivate) or hard delete
        db (Session): Database session

    Returns:
        dict: Deletion result
    """
    try:
        db_ops = DatabaseOperations(db)

        # Check if project exists
        project = db_ops.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"项目ID {project_id} 未找到")

        # Prevent deletion of the default project
        if project.name == "远控场景":
            raise HTTPException(status_code=400, detail="Cannot delete the default '远控场景' project")

        success = db_ops.delete_project(project_id, soft_delete=soft_delete)

        if success:
            return {
                "message": f"Project {project_id} {'deactivated' if soft_delete else 'deleted'} successfully",
                "project_id": project_id,
                "soft_deleted": soft_delete
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete project")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")


@main_router.get("/projects/{project_id}/stats", response_model=ProjectStatsResponse, tags=["projects"])
async def get_project_stats(project_id: int, db = Depends(get_db)):
    """
    Get statistics for a project.

    Args:
        project_id (int): Project ID
        db (Session): Database session

    Returns:
        ProjectStatsResponse: Project statistics
    """
    try:
        db_ops = DatabaseOperations(db)

        # Check if project exists
        project = db_ops.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"项目ID {project_id} 未找到")

        # Get project statistics
        stats = db_ops.get_project_stats(project_id)

        project_stats = ProjectStats(
            project_id=project_id,
            project_name=project.name,
            projects_count=1,  # Current project count (single project)
            test_cases_count=stats.get('unified_test_cases', 0),
            generation_jobs_count=stats.get('generation_jobs', 0),
            knowledge_entities_count=stats.get('knowledge_entities', 0),
            prompts_count=stats.get('prompts', 0)
        )

        # Get total projects count
        all_projects = db_ops.get_all_projects(active_only=True)

        return ProjectStatsResponse(
            projects=[project_stats],
            total_projects=len(all_projects)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project stats: {str(e)}")


@main_router.post("/generate-test-cases", response_model=GenerateResponse, tags=["test-cases"])
async def generate_test_cases_for_business(
    request: GenerateTestCaseRequest,
    background_tasks: BackgroundTasks,
    project_id: Optional[int] = Query(None, description="Project ID to associate with the generation job"),
    db: Session = Depends(get_db)
):
    """
    Generate test cases for a specific business type.

    Args:
        request: Generation request with business type
        background_tasks: FastAPI background tasks
        project_id: Optional project ID to associate with the generation job
        db: Database session

    Returns:
        GenerateResponse: Task information
    """
    # Validate business type using new dynamic system
    business_config = db.query(BusinessTypeConfig).filter(
        BusinessTypeConfig.code == request.business_type.upper(),
        BusinessTypeConfig.is_active == True
    ).first()

    if not business_config:
        # Get list of available business types for error message
        available_types = db.query(BusinessTypeConfig.code).filter(
            BusinessTypeConfig.is_active == True
        ).order_by(BusinessTypeConfig.code).all()
        available_list = [bt[0] for bt in available_types]

        raise HTTPException(
            status_code=400,
            detail=f"Invalid or inactive business type '{request.business_type}'. "
                   f"Available active types: {available_list}"
        )

    # Try to get legacy enum for backward compatibility
    try:
        business_enum = BusinessType(request.business_type.upper())
    except ValueError:
        # If enum doesn't exist, we'll handle this in the background task
        business_enum = None
        logger.warning(f"Business type '{request.business_type}' exists in new system but not in legacy enum")

    # Validate project ID (with backward compatibility)
    project = validate_project_id(project_id, db, use_default=True)

    # Generate task ID
    task_id = str(uuid.uuid4())

    # Create job in database (handle None business_enum for new system)
    db_operations = DatabaseOperations(db)
    if business_enum:
        job = db_operations.create_generation_job(task_id, business_enum, project.id)
    else:
        # Create job with string business type if enum doesn't exist
        job = GenerationJob(
            id=task_id,
            project_id=project.id,
            business_type=BusinessType(request.business_type.upper()) if request.business_type.upper() in [bt.value for bt in BusinessType] else None,
            status=JobStatus.PENDING
        )
        db.add(job)
        db.commit()
        db.refresh(job)

    # Initialize task progress for real-time updates
    task_progress[task_id] = {
        "progress": 0,
        "test_case_id": None
    }

    # Add background task
    background_tasks.add_task(
        generate_test_cases_background,
        task_id,
        request.business_type,  # Pass string business type
        project.id  # Pass project ID
    )

    return GenerateResponse(
        task_id=task_id,
        status=JobStatus.PENDING.value,
        message=f"Test case generation started for {request.business_type}"
    )


@main_router.get("/status/{task_id}", response_model=TaskStatusResponse, tags=["tasks"])
async def get_task_status(task_id: str):
    """
    Get the status of a test case generation task.

    Args:
        task_id: Task identifier

    Returns:
        TaskStatusResponse: Task status information
    """
    # Get additional progress info from memory if available
    progress_info = task_progress.get(task_id, {})

    # Get job from database and access all properties within the session
    with db_manager.get_session() as db:
        from ..database.models import GenerationJob, Project
        job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()

        if not job:
            raise HTTPException(status_code=404, detail="任务未找到")

        # Get project information for the job
        project_name = None
        if job.project_id:
            project = db.query(Project).filter(Project.id == job.project_id).first()
            project_name = project.name if project else None

        return TaskStatusResponse(
            task_id=task_id,
            status=job.status.value,
            progress=progress_info.get("progress"),
            project_id=job.project_id,
            project_name=project_name,
            business_type=job.business_type.value,
            error=job.error_message,
            test_case_id=progress_info.get("test_case_id")
        )


@main_router.get("/test-cases/export", tags=["test-cases"])
async def export_test_cases_to_excel(
    business_type: Optional[str] = None,
    project_id: Optional[int] = None
):
    """
    Export test cases to Excel file with optional business type and project filtering.

    Args:
        business_type (Optional[str]): Filter by business type (RCC, RFD, ZAB, ZBA)
        project_id (Optional[int]): Filter by project ID

    Returns:
        StreamingResponse: Excel file download
    """
    try:
        # Parse business type if provided
        business_enum = None
        if business_type:
            try:
                business_enum = BusinessType(business_type.upper())
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid business type '{business_type}'. "
                           f"Supported types: {[bt.value for bt in BusinessType]}"
                )

        # Get test case data from database
        with db_manager.get_session() as db:
            from ..database.models import Project, UnifiedTestCase

            # Build query with business type and project filtering
            query = db.query(Project)
            if business_enum:
                query = query.filter(Project.business_type == business_enum)
            if project_id:
                query = query.filter(Project.project_id == project_id)

            groups = query.order_by(Project.created_at.desc()).all()

            if not groups:
                raise HTTPException(
                    status_code=404,
                    detail=f"No test cases found" + (f" for business type {business_enum.value}" if business_enum else "")
                )

            # Convert test case items to TestCase objects
            test_cases = []
            for group in groups:
                items = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.project_id == group.id
                ).order_by(UnifiedTestCase.entity_order.asc()).all()

                for item in items:
                    # Parse JSON fields
                    preconditions = json.loads(item.preconditions) if item.preconditions else []
                    steps = json.loads(item.steps) if item.steps else []
                    expected_result = json.loads(item.expected_result) if item.expected_result else []

                    # Create TestCase object
                    test_case = TestCase(
                        id=item.test_case_id,
                        name=item.name,
                        module=item.module or "",
                        preconditions=preconditions if isinstance(preconditions, list) else str(preconditions),
                        remarks=item.remarks or "",
                        steps=steps if isinstance(steps, list) else [str(steps)],
                        expected_result=expected_result if isinstance(expected_result, list) else str(expected_result),
                        functional_module=item.functional_module or "",
                        functional_domain=item.functional_domain or ""
                    )
                    test_cases.append(test_case)

        if not test_cases:
            raise HTTPException(
                status_code=404,
                detail=f"No test case items found" + (f" for business type {business_enum.value}" if business_enum else "")
            )

        # Convert to Excel rows using existing ExcelConverter
        excel_rows = ExcelConverter.test_cases_to_excel_rows(test_cases)

        # Create Excel file in memory
        output = io.BytesIO()
        data = [row.model_dump() for row in excel_rows]

        import pandas as pd
        import xlsxwriter

        # Create DataFrame and save to Excel in memory
        df = pd.DataFrame(data)

        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='TestCases')

            # Get the workbook and worksheet objects for formatting
            workbook = writer.book
            worksheet = writer.sheets['TestCases']

            # Create a text wrap format
            wrap_format = workbook.add_format({'text_wrap': True, 'valign': 'top'})

            # Apply text wrap format to columns that need it
            worksheet.set_column('D:D', 30, wrap_format)  # 前置条件
            worksheet.set_column('F:F', 30, wrap_format)  # 步骤描述
            worksheet.set_column('G:G', 30, wrap_format)  # 预期结果

            # Auto-adjust row heights for better visibility
            for i in range(len(df) + 1):  # +1 for header row
                worksheet.set_row(i, 30)  # Set row height to 30 pixels

        # Prepare file for download
        output.seek(0)

        # Generate filename with timestamp and business type
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        business_suffix = f"_{business_enum.value}" if business_enum else ""
        filename = f"test_cases{business_suffix}_{timestamp}.xlsx"

        # Return file as streaming response
        return StreamingResponse(
            io.BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export test cases: {str(e)}")


@main_router.get("/test-cases/{business_type}", response_model=TestCasesListResponse, tags=["test-cases"])
async def get_test_cases_by_business_type(
    business_type: str,
    project_id: Optional[int] = None,
    db = Depends(get_db)
):
    """
    Get test cases for a specific business type.

    Args:
        business_type: Business type (RCC, RFD, ZAB, ZBA)
        project_id: Optional project ID to filter by project
        db: Database session

    Returns:
        TestCasesListResponse: List of test case groups for the business type
    """
    # Validate business type
    try:
        business_enum = BusinessType(business_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid business type '{business_type}'. "
                   f"Supported types: {[bt.value for bt in BusinessType]}"
        )

    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)
    effective_project_id = project.id if project_id is None else project_id

    # Get test case groups from database
    from ..database.models import Project, UnifiedTestCase, Project
    db_operations = DatabaseOperations(db)

    # Build query with project filtering
    query = db.query(Project).filter(Project.business_type == business_enum)
    query = query.filter(Project.project_id == effective_project_id)

    # Join with Project to get project name
    query = query.join(Project, Project.project_id == Project.id)

    groups = query.order_by(Project.created_at.desc()).all()

    # Convert to response format
    
    for group in groups:
        # Get test case items for this group
        items = db.query(UnifiedTestCase).filter(
            UnifiedTestCase.project_id == group.id
        ).order_by(UnifiedTestCase.entity_order.asc()).all()

        # Convert items to response format
        item_responses = []
        for item in items:
            # Parse JSON fields
            preconditions = json.loads(item.preconditions) if item.preconditions else []
            steps = json.loads(item.steps) if item.steps else []
            expected_result = json.loads(item.expected_result) if item.expected_result else []

            item_responses.append(UnifiedTestCaseResponse(
                id=item.id,
                project_id=item.project_id,
                test_case_id=item.test_case_id,
                name=item.name,
                description=item.description,
                module=item.module,
                functional_module=item.functional_module,
                functional_domain=item.functional_domain,
                preconditions=preconditions,
                steps=steps,
                expected_result=expected_result,
                remarks=item.remarks,
                entity_order=item.entity_order,
                created_at=item.created_at.isoformat()
            ))

        # Parse generation metadata
        generation_metadata = None
        if group.generation_metadata:
            try:
                generation_metadata = json.loads(group.generation_metadata)
            except:
                pass

        
        return TestCasesListResponse(
            business_type=business_enum.value,
            count=len(test_cases),
            test_cases=test_cases
        )


@main_router.get("/test-cases", response_model=TestCasesListResponse, tags=["test-cases"])
async def get_all_test_cases(
    project_id: Optional[int] = None,
    db = Depends(get_db)
):
    """
    Get all test cases from all business types.

    Args:
        project_id (Optional[int]): Project ID to filter test cases by project
        db (Session): Database session

    Returns:
        TestCasesListResponse: List of all test case groups
    """
    # Validate project ID with backward compatibility
    project = validate_project_id(project_id, db, use_default=True)
    # Use the validated project ID for filtering
    effective_project_id = project.id if project_id is None else project_id

    # Get all test case groups from database
    from ..database.models import Project, UnifiedTestCase
    db_operations = DatabaseOperations(db)

    # Get all test cases with project filtering (always filter by project)
    query = db.query(UnifiedTestCase)
    if effective_project_id:
        query = query.filter(UnifiedTestCase.project_id == effective_project_id)
    test_cases = query.order_by(UnifiedTestCase.created_at.desc()).all()

    # Convert all test cases to response format
    all_test_cases = []
    for test_case in test_cases:
        # Parse JSON fields
        preconditions = json.loads(test_case.preconditions) if test_case.preconditions else []
        steps = json.loads(test_case.steps) if test_case.steps else []
        expected_result = json.loads(test_case.expected_result) if test_case.expected_result else []

        all_test_cases.append(UnifiedTestCaseResponse(
            id=test_case.id,
            project_id=test_case.project_id,
            test_case_id=test_case.test_case_id,
            name=test_case.name,
            description=test_case.description,
            business_type=test_case.business_type,
            module=test_case.module,
            functional_module=test_case.functional_module,
            functional_domain=test_case.functional_domain,
            preconditions=preconditions,
            steps=steps,
            expected_result=expected_result,
            remarks=test_case.remarks,
            entity_order=test_case.entity_order,
            created_at=test_case.created_at.isoformat()
        ))

    return TestCasesListResponse(
        business_type=None,  # All business types
        count=len(all_test_cases),
        projects=[]  # Return empty projects list for now since this API structure needs redesign
    )


@main_router.delete("/test-cases/{business_type}", tags=["test-cases"])
async def delete_test_cases_by_business_type(
    business_type: str,
    project_id: Optional[int] = None
):
    """
    Delete all test cases for a specific business type, including knowledge graph entities and relations.

    Args:
        business_type: Business type (RCC, RFD, ZAB, ZBA)
        project_id (Optional[int]): Project ID to restrict deletion to specific project

    Returns:
        Dict: Deletion result
    """
    # Validate business type
    try:
        business_enum = BusinessType(business_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid business type '{business_type}'. "
                   f"Supported types: {[bt.value for bt in BusinessType]}"
        )

    # Delete test case groups and related data using database operations
    with db_manager.get_session() as db:
        db_operations = DatabaseOperations(db)

        # Get test case groups to delete before removing them
        from ..database.models import (Project, UnifiedTestCase, TestCaseEntity,
                                     KnowledgeEntity, KnowledgeRelation, EntityType)

        # Build query with business type and project filtering
        query = db.query(Project).filter(Project.business_type == business_enum)
        if project_id:
            query = query.filter(Project.project_id == project_id)
        groups = query.all()

        if not groups:
            return {
                "message": f"No test case groups found for {business_enum.value}",
                "deleted_count": 0
            }

        # Delete related data including knowledge graph entities
        deleted_groups_count = 0
        deleted_items_count = 0
        deleted_knowledge_entities_count = 0
        deleted_knowledge_relations_count = 0

        for group in groups:
            # Get test case items for this group
            items = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.project_id == group.id
            ).all()

            # Delete test case entities and related knowledge graph data for each item
            for item in items:
                # Delete TestCaseEntity mappings
                tc_entities = db.query(TestCaseEntity).filter(
                    TestCaseEntity.test_case_item_id == item.id
                ).all()

                for tc_entity in tc_entities:
                    db.delete(tc_entity)

                # Find and delete knowledge graph entities for this test case item
                # Look for TEST_CASE type entities that have this item_id in their extra_data
                knowledge_entities = db.query(KnowledgeEntity).filter(
                    KnowledgeEntity.type == EntityType.TEST_CASE,
                    KnowledgeEntity.business_type == business_enum,
                    KnowledgeEntity.extra_data.like(f'%"test_case_item_id": {item.id}%')
                ).all()

                for ke_entity in knowledge_entities:
                    # Delete relations involving this entity
                    relations = db.query(KnowledgeRelation).filter(
                        (KnowledgeRelation.subject_id == ke_entity.id) |
                        (KnowledgeRelation.object_id == ke_entity.id)
                    ).all()

                    for relation in relations:
                        db.delete(relation)
                        deleted_knowledge_relations_count += 1

                    # Delete the knowledge entity
                    db.delete(ke_entity)
                    deleted_knowledge_entities_count += 1

                deleted_items_count += 1

            # Delete the group (this will cascade delete items due to relationship)
            db.delete(group)
            deleted_groups_count += 1

        # Commit all deletions
        db.commit()

    return {
        "message": f"Test case groups, items, and knowledge graph entities for {business_enum.value} deleted successfully",
        "deleted_groups_count": deleted_groups_count,
        "deleted_items_count": deleted_items_count,
        "deleted_knowledge_entities_count": deleted_knowledge_entities_count,
        "deleted_knowledge_relations_count": deleted_knowledge_relations_count
    }


# DEPRECATED: This endpoint has been moved to business_endpoints.py and config_endpoints.py
# to avoid route conflicts. Use /api/v1/business/business-types or /api/v1/config/business-types instead.
# @main_router.get("/business-types", response_model=BusinessTypeResponse, tags=["business-types"])
# async def get_business_types(
    # DEPRECATED: Get list of supported business types from database, filtered by project.
    # This functionality has been moved to business_endpoints.py and config_endpoints.py
    #
    # Args:
    #     project_id (Optional[int]): Project ID to filter business types by project
    #     db (Session): Database session
    #
    # Returns:
    #     BusinessTypeResponse: List of supported business types for the specified project
    # """
    # # Validate project ID if provided
    # project = validate_project_id(project_id, db, use_default=False)
    #
    # try:
    #     # Get business types configured for this project
    #     if project_id:
    #         business_type_configs = db.query(BusinessTypeConfig).filter(
    #             BusinessTypeConfig.project_id == project_id,
    #             BusinessTypeConfig.is_active == True
    #         ).order_by(BusinessTypeConfig.code).all()
    #     else:
    #         # Return all active business types if no project specified
    #         business_type_configs = db.query(BusinessTypeConfig).filter(
    #             BusinessTypeConfig.is_active == True
    #         ).order_by(BusinessTypeConfig.code).all()
    #
    #     business_types = [config.code for config in business_type_configs]
    #     return BusinessTypeResponse(business_types=business_types)
    #
    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=f"Failed to get business types: {str(e)}")




@main_router.get("/tasks", tags=["tasks"])
async def list_tasks(project_id: Optional[int] = None, db = Depends(get_db)):
    """
    List all tasks and their status.

    Args:
        project_id (Optional[int]): Project ID to filter tasks by project
        db (Session): Database session

    Returns:
        Dict: List of all tasks
    """
    tasks = []
    # Get all jobs from database and access all properties within the session
    from ..database.models import GenerationJob

    # Build query with optional project filtering
    query = db.query(GenerationJob)
    if project_id:
        query = query.filter(GenerationJob.project_id == project_id)
    jobs = query.all()

    for job in jobs:
        # Get additional progress info from memory if available
        progress_info = task_progress.get(job.id, {})

        tasks.append({
            "task_id": job.id,
            "status": job.status.value,
            "progress": progress_info.get("progress"),
            "business_type": job.business_type.value,
            "error": job.error_message,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        })

    return {"tasks": tasks}


@main_router.delete("/tasks/{task_id}", tags=["tasks"])
async def delete_task(task_id: str):
    """
    Delete a task from the task store.

    Args:
        task_id: Task identifier

    Returns:
        Dict: Deletion result
    """
    # Delete from database
    with db_manager.get_session() as db:
        from ..database.models import GenerationJob
        job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="任务未找到")
        db.delete(job)
        db.commit()

    # Clean up progress info
    if task_id in task_progress:
        del task_progress[task_id]

    return {"message": "Task deleted successfully"}


async def generate_test_cases_background(task_id: str, business_type: str, project_id: int):
    """
    Background task for test case generation.

    This function runs blocking operations (LLM calls) in a thread pool to avoid
    blocking the event loop and other API requests.

    Args:
        task_id: Task identifier
        business_type: Business type for generation
        project_id: Project ID to associate with generated test cases
    """
    import time
    import traceback
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    start_time = time.time()

    try:
        logger.info(f"Background task started for {business_type} (ID: {task_id[:8]}...)")
        logger.debug(f"Task ID: {task_id}, Business Type: {business_type}, Project ID: {project_id}")

        # Validate input parameters
        if not task_id:
            raise ValueError("Task ID is required")
        if not business_type:
            raise ValueError("Business type is required")
        if not project_id or project_id <= 0:
            raise ValueError(f"Invalid project ID: {project_id}")

        # Update status to running
        with db_manager.get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                db.commit()

        task_progress[task_id]["progress"] = 10

        # Initialize generator (quick operation)
        generator = TestCaseGenerator(config)
        task_progress[task_id]["progress"] = 30

        # Run blocking LLM operations in thread pool
        try:
            logger.debug("Starting LLM generation in thread pool...")
            gen_start = time.time()

            # Create a separate function for the blocking operations
            def run_blocking_generation():
                return generator.generate_test_cases_for_business(business_type)

            # Run in thread pool to avoid blocking event loop
            loop = asyncio.get_event_loop()
            test_cases_data = await loop.run_in_executor(None, run_blocking_generation)
        except Exception as e:
            raise Exception(f"Generation failed for {business_type}: {str(e)}") from e

        task_progress[task_id]["progress"] = 70

        # Save to database (also run in thread pool if it might be blocking)
        try:
            db_start = time.time()

            def run_database_save():
                result = generator.save_to_database(test_cases_data, business_type, project_id)
                return result

            # Run database operations in thread pool
            success = await loop.run_in_executor(None, run_database_save)

            if not success:
                raise Exception("Failed to save test cases to database")
        except Exception as e:
            raise Exception(f"Database save failed for {business_type}: {str(e)}") from e

        task_progress[task_id]["progress"] = 90

        # Get the created test case group ID (quick operation)
        with db_manager.get_session() as db:
            from ..database.models import Project
            group = db.query(Project).filter(
                Project.business_type == BusinessType(business_type.upper())
            ).order_by(Project.created_at.desc()).first()

            if group:
                task_progress[task_id]["test_case_id"] = group.id

        # Update completion status
        with db_manager.get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                db.commit()

        task_progress[task_id]["progress"] = 100
        total_time = time.time() - start_time

    except Exception as e:
        total_time = time.time() - start_time
        error_message = str(e)

        # Update failed status in database
        with db_manager.get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = error_message[:2000] + "..." if len(error_message) > 2000 else error_message
                db.commit()

        # Clean up progress info
        if task_id in task_progress:
            del task_progress[task_id]


# ========================================
# TWO-STAGE GENERATION BACKGROUND TASKS
# ========================================

async def generate_test_points_background(task_id: str, business_type: str, project_id: int):
    """Background task for generating test points (Stage 1)."""
    import time

    start_time = time.time()

    task_progress[task_id] = {
        "status": "running",
        "progress": 0,
        "message": "开始生成测试点...",
        "business_type": business_type,
        "project_id": project_id
    }

    try:
        config = Config()
        generator = TestCaseGenerator(config)

        # Update progress: Starting
        with DatabaseManager(config).get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                job.current_step = 1
                job.step_description = "开始生成测试点..."
                db.commit()

        task_progress[task_id]["progress"] = 10

        # Generate test points
        test_points_result = generator.generate_test_points(business_type)
        if test_points_result is None:
            raise RuntimeError("测试点生成失败")

        # Update progress: Completed
        task_progress[task_id]["progress"] = 80
        task_progress[task_id]["message"] = "测试点生成完成，正在保存结果..."

        # Save test points to job result
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.result_data = json.dumps(test_points_result, ensure_ascii=False)
                job.current_step = 2
                job.step_description = "测试点生成完成"
                db.commit()

        task_progress[task_id]["progress"] = 100
        task_progress[task_id]["message"] = "测试点生成任务完成"

        # Update completion status
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                db.commit()

        total_time = time.time() - start_time

    except Exception as e:
        total_time = time.time() - start_time
        error_message = str(e)

        # Update failed status
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = error_message[:2000] + "..." if len(error_message) > 2000 else error_message
                db.commit()

        task_progress[task_id]["status"] = "failed"
        task_progress[task_id]["error"] = error_message

        if task_id in task_progress:
            del task_progress[task_id]


async def generate_test_cases_from_points_background(task_id: str, business_type: str, test_points: Dict[str, Any], project_id: int):
    """Background task for generating test cases from test points (Stage 2)."""
    import time

    start_time = time.time()

    task_progress[task_id] = {
        "status": "running",
        "progress": 0,
        "message": "开始基于测试点生成测试用例...",
        "business_type": business_type,
        "project_id": project_id
    }

    try:
        config = Config()
        generator = TestCaseGenerator(config)

        # Update progress: Starting
        with DatabaseManager(config).get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                job.current_step = 1
                job.step_description = "开始基于测试点生成测试用例..."
                db.commit()

        task_progress[task_id]["progress"] = 10

        # Generate test cases from test points
        test_cases_result = generator.generate_test_cases_from_points(business_type, test_points)
        if test_cases_result is None:
            raise RuntimeError("基于测试点的测试用例生成失败")

        # Update progress: Completed
        task_progress[task_id]["progress"] = 80
        task_progress[task_id]["message"] = "测试用例生成完成，正在保存结果..."

        # Save test cases to job result
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                complete_result = {
                    "test_points": test_points,
                    "test_cases": test_cases_result
                }
                job.result_data = json.dumps(complete_result, ensure_ascii=False)
                job.current_step = 2
                job.step_description = "测试用例生成完成"
                db.commit()

        task_progress[task_id]["progress"] = 100
        task_progress[task_id]["message"] = "基于测试点的测试用例生成任务完成"

        # Update completion status
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                db.commit()

        total_time = time.time() - start_time

    except Exception as e:
        total_time = time.time() - start_time
        error_message = str(e)

        # Update failed status
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = error_message[:2000] + "..." if len(error_message) > 2000 else error_message
                db.commit()

        task_progress[task_id]["status"] = "failed"
        task_progress[task_id]["error"] = error_message

        if task_id in task_progress:
            del task_progress[task_id]


async def generate_test_cases_two_stage_background(task_id: str, business_type: str, project_id: int):
    """Background task for complete two-stage test case generation."""
    import time

    start_time = time.time()

    task_progress[task_id] = {
        "status": "running",
        "progress": 0,
        "message": "开始两阶段测试生成...",
        "business_type": business_type,
        "project_id": project_id
    }

    try:
        config = Config()
        generator = TestCaseGenerator(config)

        # Stage 1: Generate test points

        # Update progress for Stage 1
        with DatabaseManager(config).get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                job.current_step = 1
                job.step_description = "阶段 1: 生成测试点..."
                db.commit()

        task_progress[task_id]["progress"] = 15
        task_progress[task_id]["message"] = "阶段 1: 生成测试点..."

        test_points_result = generator.generate_test_points(business_type)
        if test_points_result is None:
            raise RuntimeError("阶段 1 失败：测试点生成失败")

        # Update progress after Stage 1
        task_progress[task_id]["progress"] = 45
        task_progress[task_id]["message"] = "阶段 1 完成，准备阶段 2..."

        # Stage 2: Generate test cases from test points

        # Update progress for Stage 2
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.current_step = 4
                job.step_description = "阶段 2: 基于测试点生成测试用例..."
                db.commit()

        task_progress[task_id]["progress"] = 50
        task_progress[task_id]["message"] = "阶段 2: 基于测试点生成测试用例..."

        test_cases_result = generator.generate_test_cases_from_points(business_type, test_points_result)
        if test_cases_result is None:
            raise RuntimeError("阶段 2 失败：测试用例生成失败")

        # Save complete result with test points data included
        # We need to combine test_points and test_cases for proper database storage
        combined_result = test_points_result.copy() if test_points_result else {}
        if test_cases_result and 'test_cases' in test_cases_result:
            combined_result['test_cases'] = test_cases_result['test_cases']

        # Save test cases to database with test points metadata

        # Update progress: Finalizing
        task_progress[task_id]["progress"] = 85
        task_progress[task_id]["message"] = "两阶段生成完成，正在保存结果..."

        # First, save test points to database
        if test_points_result:
            test_point_generator = generator.test_point_generator if hasattr(generator, 'test_point_generator') else None
            if test_point_generator:
                project_id = test_point_generator.save_test_points_to_database(test_points_result, business_type, project_id)
                if project_id:
                    task_progress[task_id]["message"] = "测试点已保存到数据库，正在保存测试用例..."
                else:
                    task_progress[task_id]["message"] = "测试点保存失败，但继续保存测试用例..."

        # Save test cases to database with test points metadata
        if test_cases_result:
            # Ensure the combined result has test points data for proper associations
            save_result = generator.save_test_cases_to_database(combined_result, business_type, project_id)
            if save_result:
                task_progress[task_id]["message"] = "测试用例已保存到数据库..."
            else:
                task_progress[task_id]["message"] = "测试用例保存失败..."

        # Save complete result to job
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.result_data = json.dumps(combined_result, ensure_ascii=False)
                job.current_step = 6
                job.step_description = "两阶段生成完成"
                db.commit()

        task_progress[task_id]["progress"] = 100
        task_progress[task_id]["message"] = "两阶段测试生成任务完成"

        # Update completion status
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                db.commit()

        total_time = time.time() - start_time

    except Exception as e:
        total_time = time.time() - start_time
        error_message = str(e)

        # Update failed status
        with DatabaseManager(config).get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = error_message[:2000] + "..." if len(error_message) > 2000 else error_message
                db.commit()

        task_progress[task_id]["status"] = "failed"
        task_progress[task_id]["error"] = error_message

        if task_id in task_progress:
            del task_progress[task_id]


async def batch_generate_test_cases_background(
    task_id: str,
    business_types: List[str],
    additional_context: Optional[Dict[str, Any]],
    project_id: int
):
    """
    Background task for batch generating test cases for multiple business types.

    Args:
        task_id: Unique task identifier
        business_types: List of business type codes
        additional_context: Additional generation context
        project_id: Project ID
    """
    db = DatabaseManager(get_config()).get_session()
    results = {
        "successful": [],
        "failed": [],
        "results": {}
    }

    try:
        task_progress[task_id] = {
            "status": "running",
            "current_step": 1,
            "total_steps": len(business_types),
            "progress": 0,
            "business_types": business_types
        }

        for i, business_type in enumerate(business_types):
            # Update progress
            task_progress[task_id].update({
                "current_step": i + 1,
                "progress": int((i / len(business_types)) * 100),
                "current_business_type": business_type
            })

            try:
                # Get test points for this business type
                test_points = db.query(TestPoint).filter(
                    TestPoint.business_type == business_type.upper(),
                    TestPoint.project_id == project_id,
                    TestPoint.status == "approved"
                ).all()

                if not test_points:
                    results["failed"].append(business_type)
                    results["results"][business_type] = {
                        "error": "No approved test points found"
                    }
                    continue

                # Convert to dictionary format
                test_points_data = {
                    "test_points": [
                        {
                            "id": tp.id,
                            "test_point_id": tp.test_point_id,
                            "title": tp.title,
                            "description": tp.description,
                            "business_type": tp.business_type,
                            "priority": tp.priority
                        } for tp in test_points
                    ]
                }

                # Generate test cases from test points
                generator = TestCaseGenerator(db)
                test_cases = await generator.generate_test_cases_from_external_points(
                    business_type,
                    test_points_data,
                    additional_context,
                    project_id
                )

                results["successful"].append(business_type)
                results["results"][business_type] = {
                    "cases_count": len(test_cases.get("test_cases", [])),
                    "test_cases": test_cases.get("test_cases", [])
                }

            except Exception as e:
                logger.error(f"Error generating test cases for {business_type}: {str(e)}")
                results["failed"].append(business_type)
                results["results"][business_type] = {
                    "error": str(e)
                }

        # Final update
        task_progress[task_id].update({
            "status": "completed",
            "progress": 100,
            "results": results
        })

        # Update job status
        for business_type in business_types:
            job_id = f"{task_id}-{business_type}"
            job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
            if job:
                job.status = JobStatus.COMPLETED if business_type in results["successful"] else JobStatus.FAILED
                job.completed_at = datetime.now()
                db.commit()

    except Exception as e:
        logger.error(f"Batch test case generation failed: {str(e)}")
        error_message = f"批量生成失败: {str(e)}"

        if task_id in task_progress:
            task_progress[task_id].update({
                "status": "failed",
                "error": error_message
            })

        # Update all jobs to failed status
        for business_type in business_types:
            job_id = f"{task_id}-{business_type}"
            job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.completed_at = datetime.now()
                db.commit()
    finally:
        db.close()


# Knowledge Graph Endpoints

@main_router.get("/knowledge-graph/data", response_model=KnowledgeGraphResponse, tags=["knowledge-graph"])
async def get_knowledge_graph_data(
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db = Depends(get_db)
):
    """
    Get knowledge graph data for visualization.

    Args:
        business_type (Optional[str]): Filter by business type
        project_id (Optional[int]): Filter by project ID
        db (Session): Database session

    Returns:
        KnowledgeGraphResponse: Graph data in G6 format
    """
    try:
        # 添加调试日志

        # Validate project ID with backward compatibility
        project = validate_project_id(project_id, db, use_default=True)
        # Use the validated project ID for filtering
        effective_project_id = project.id if project_id is None else project_id

        db_operations = DatabaseOperations(db)

        # Parse business type if provided
        business_enum = None
        if business_type:
            try:
                business_enum = BusinessType(business_type.upper())
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid business type '{business_type}'. "
                           f"Supported types: {[bt.value for bt in BusinessType]}"
                )

        # Get graph data with project filtering
        graph_data = db_operations.get_knowledge_graph_data(business_enum, effective_project_id)

        # Convert to response format
        nodes = [GraphNode(**node) for node in graph_data["nodes"]]
        edges = [GraphEdge(**edge) for edge in graph_data["edges"]]

        return KnowledgeGraphResponse(nodes=nodes, edges=edges)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get knowledge graph data: {str(e)}")


@main_router.get("/knowledge-graph/entities", response_model=List[GraphEntityResponse], tags=["knowledge-graph"])
async def get_knowledge_entities(
    entity_type: Optional[str] = None,
    business_type: Optional[str] = None,
    project_id: Optional[int] = None
):
    """
    Get knowledge graph entities.

    Args:
        entity_type (Optional[str]): Filter by entity type (business, service, interface)
        business_type (Optional[str]): Filter by business type
        project_id (Optional[int]): Filter by project ID

    Returns:
        List[GraphEntityResponse]: List of entities
    """
    try:
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)

            # Parse filters
            entity_enum = None
            if entity_type:
                try:
                    entity_enum = EntityType(entity_type)
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid entity type '{entity_type}'. "
                               f"Supported types: {[et.value for et in EntityType]}"
                    )

            business_enum = None
            if business_type:
                try:
                    business_enum = BusinessType(business_type.upper())
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid business type '{business_type}'. "
                               f"Supported types: {[bt.value for bt in BusinessType]}"
                    )

            # Get entities with project filtering
            if project_id:
                # Start with project-filtered entities
                entities = db_operations.get_knowledge_entities_by_project(project_id)

                # Apply additional filters
                if entity_enum and business_enum:
                    entities = [e for e in entities if e.type == entity_enum and e.business_type == business_enum]
                elif entity_enum:
                    entities = [e for e in entities if e.type == entity_enum]
                elif business_enum:
                    entities = [e for e in entities if e.business_type == business_enum]
            else:
                # No project filtering - use existing logic
                if entity_enum and business_enum:
                    entities = db_operations.get_knowledge_entities_by_type(entity_enum)
                    entities = [e for e in entities if e.business_type == business_enum]
                elif entity_enum:
                    entities = db_operations.get_knowledge_entities_by_type(entity_enum)
                elif business_enum:
                    entities = db_operations.get_knowledge_entities_by_business_type(business_enum)
                else:
                    entities = db_operations.get_all_knowledge_entities()

            # Convert to response format
            response = []
            for entity in entities:
                metadata_dict = None
                if entity.extra_data:
                    import json
                    try:
                        metadata_dict = json.loads(entity.extra_data)
                    except:
                        pass

                response.append(GraphEntityResponse(
                    id=entity.id,
                    name=entity.name,
                    type=entity.type.value,
                    description=entity.description,
                    business_type=entity.business_type.value if entity.business_type else None,
                    metadata=metadata_dict,
                    created_at=entity.created_at.isoformat()
                ))

            return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entities: {str(e)}")


@main_router.get("/knowledge-graph/relations", response_model=List[GraphRelationResponse], tags=["knowledge-graph"])
async def get_knowledge_relations(
    business_type: Optional[str] = None,
    project_id: Optional[int] = None
):
    """
    Get knowledge graph relations.

    Args:
        business_type (Optional[str]): Filter by business type
        project_id (Optional[int]): Filter by project ID

    Returns:
        List[GraphRelationResponse]: List of relations
    """
    try:
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)

            # Parse business type
            business_enum = None
            if business_type:
                try:
                    business_enum = BusinessType(business_type.upper())
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid business type '{business_type}'. "
                               f"Supported types: {[bt.value for bt in BusinessType]}"
                    )

            # Get relations with project filtering
            if project_id:
                # Start with project-filtered relations
                relations = db_operations.get_knowledge_relations_by_project(project_id)

                # Apply business type filter if specified
                if business_enum:
                    relations = [r for r in relations if r.business_type == business_enum]
            else:
                # No project filtering - use existing logic
                if business_enum:
                    relations = db_operations.get_knowledge_relations_by_business_type(business_enum)
                else:
                    relations = db_operations.get_all_knowledge_relations()

            # Convert to response format
            response = []
            for relation in relations:
                response.append(GraphRelationResponse(
                    id=relation.id,
                    subject=relation.subject.name,
                    predicate=relation.predicate,
                    object=relation.object.name,
                    business_type=relation.business_type.value if relation.business_type else None,
                    created_at=relation.created_at.isoformat()
                ))

            return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get relations: {str(e)}")


@main_router.get("/knowledge-graph/stats", response_model=GraphStatsResponse)
async def get_knowledge_graph_stats():
    """
    Get knowledge graph statistics.

    Returns:
        GraphStatsResponse: Graph statistics
    """
    try:
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)
            stats = db_operations.get_knowledge_graph_stats()

            return GraphStatsResponse(**stats)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get graph stats: {str(e)}")


@main_router.post("/knowledge-graph/initialize")
async def initialize_knowledge_graph():
    """
    Initialize knowledge graph data from business descriptions.

    Returns:
        Dict: Initialization result
    """
    try:
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)
            extractor = BusinessDataExtractor(db_operations)

            # Extract all business data
            success = extractor.extract_all_business_data()

            if success:
                stats = extractor.get_extraction_summary()
                return {
                    "message": "Knowledge graph initialized successfully",
                    "stats": stats
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to initialize knowledge graph")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize knowledge graph: {str(e)}")


@main_router.delete("/knowledge-graph/clear")
async def clear_knowledge_graph():
    """
    Clear all knowledge graph data.

    Returns:
        Dict: Clear result
    """
    try:
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)
            deleted_count = db_operations.clear_knowledge_graph()

            return {
                "message": f"Knowledge graph cleared successfully",
                "deleted_count": deleted_count
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear knowledge graph: {str(e)}")


@main_router.get("/knowledge-graph/entities/{entity_id}/details", response_model=EntityDetailsResponse)
async def get_entity_details(entity_id: int):
    """
    Get detailed information about a specific entity including children and test cases.

    Args:
        entity_id: Entity ID

    Returns:
        EntityDetailsResponse: Detailed entity information
    """
    try:
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)

            # Get the entity
            entity = db_operations.get_knowledge_entity_by_id(entity_id)
            if not entity:
                raise HTTPException(status_code=404, detail=f"Entity with ID {entity_id} not found")

            # Get children entities
            children = db_operations.get_child_entities(entity_id)

            # Get test cases for this entity
            test_case_entities = db_operations.get_test_case_entities_by_entity(entity_id)

            # Get related entities and relations
            related_entities = db_operations.get_related_entities(entity_id)
            related_relations = db_operations.get_entity_relations(entity_id)

            # Parse extra_data if available
            business_description = None
            if entity.extra_data and entity.type == EntityType.BUSINESS:
                try:
                    extra_data = json.loads(entity.extra_data)
                    business_description = extra_data.get("full_description")
                except:
                    pass

            # Prepare test cases data
            test_cases_data = []
            for tc_entity in test_case_entities:
                # Get data from UnifiedTestCase
                item = tc_entity.test_case_item
                test_cases_data.append({
                    "id": item.id,
                    "name": tc_entity.name,
                    "description": tc_entity.description,
                    "test_data": {
                        "id": item.test_case_id,
                        "name": item.name,
                        "description": item.description,
                        "module": item.module,
                        "functional_module": item.functional_module,
                        "functional_domain": item.functional_domain,
                        "preconditions": json.loads(item.preconditions) if item.preconditions else [],
                        "steps": json.loads(item.steps) if item.steps else [],
                        "expected_result": json.loads(item.expected_result) if item.expected_result else [],
                        "remarks": item.remarks
                    },
                    "created_at": item.created_at.isoformat()
                })

            # Build children data
            children_data = []
            for child in children:
                child_dict = {
                    "id": child.id,
                    "name": child.name,
                    "type": child.type.value,
                    "description": child.description,
                    "business_type": child.business_type.value if child.business_type else None,
                    "parent_id": child.parent_id,
                    "entity_order": child.entity_order,
                    "extra_data": child.extra_data,
                    "created_at": child.created_at.isoformat(),
                    "children": None,  # Not loading nested children for now
                    "business_description": None,
                    "test_cases": None
                }
                children_data.append(EntityDetailsResponse(**child_dict))

            # Prepare related entities data
            related_entities_data = []
            for related_entity in related_entities:
                related_entities_data.append({
                    "id": related_entity.id,
                    "name": related_entity.name,
                    "type": related_entity.type.value,
                    "description": related_entity.description,
                    "business_type": related_entity.business_type.value if related_entity.business_type else None,
                    "metadata": json.loads(related_entity.extra_data) if related_entity.extra_data else {}
                })

            # Prepare related relations data
            related_relations_data = []
            for relation in related_relations:
                related_relations_data.append({
                    "id": relation.id,
                    "subject": relation.subject_id,
                    "predicate": relation.predicate,
                    "object": relation.object_id,
                    "subject_name": relation.subject.name if relation.subject else f"Entity {relation.subject_id}",
                    "object_name": relation.object.name if relation.object else f"Entity {relation.object_id}",
                    "business_type": relation.business_type.value if relation.business_type else None
                })

            return EntityDetailsResponse(
                id=entity.id,
                name=entity.name,
                type=entity.type.value,
                description=entity.description,
                business_type=entity.business_type.value if entity.business_type else None,
                parent_id=entity.parent_id,
                entity_order=entity.entity_order,
                extra_data=entity.extra_data,
                created_at=entity.created_at.isoformat(),
                children=children_data if children_data else None,
                business_description=business_description,
                test_cases=test_cases_data if test_cases_data else None,
                related_entities=related_entities_data if related_entities_data else None,
                related_relations=related_relations_data if related_relations_data else None
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entity details: {str(e)}")


@main_router.get("/knowledge-graph/entities/{entity_id}/business-description", response_model=BusinessDescriptionResponse)
async def get_entity_business_description(entity_id: int):
    """
    Get the full business description for a business entity.

    Args:
        entity_id: Entity ID

    Returns:
        BusinessDescriptionResponse: Full business description
    """
    try:
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)

            # Get the entity
            entity = db_operations.get_knowledge_entity_by_id(entity_id)
            if not entity:
                raise HTTPException(status_code=404, detail=f"Entity with ID {entity_id} not found")

            if entity.type != EntityType.BUSINESS:
                raise HTTPException(status_code=400, detail="This endpoint is only available for business entities")

            # Parse extra_data to get full description
            full_description = ""
            business_code = ""

            if entity.extra_data:
                try:
                    import json
                    extra_data = json.loads(entity.extra_data)
                    full_description = extra_data.get("full_description", "")
                    business_code = extra_data.get("business_code", "")
                except:
                    pass

            return BusinessDescriptionResponse(
                entity_id=entity.id,
                entity_name=entity.name,
                full_description=full_description,
                business_code=business_code
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get business description: {str(e)}")


@main_router.get("/knowledge-graph/entities/{entity_id}/test-cases", response_model=EntityTestCasesResponse)
async def get_entity_test_cases(entity_id: int):
    """
    Get all test cases associated with a specific entity.

    Args:
        entity_id: Entity ID

    Returns:
        EntityTestCasesResponse: List of test cases for the entity
    """
    try:
        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)

            # Get the entity
            entity = db_operations.get_knowledge_entity_by_id(entity_id)
            if not entity:
                raise HTTPException(status_code=404, detail=f"Entity with ID {entity_id} not found")

            # Get test case entities
            test_case_entities = db_operations.get_test_case_entities_by_entity(entity_id)

            # Prepare test cases data
            test_cases_data = []
            for tc_entity in test_case_entities:
                # Get data from UnifiedTestCase
                item = tc_entity.test_case_item
                test_cases_data.append({
                    "id": item.id,
                    "name": tc_entity.name,
                    "description": tc_entity.description,
                    "test_data": {
                        "id": item.test_case_id,
                        "name": item.name,
                        "description": item.description,
                        "module": item.module,
                        "functional_module": item.functional_module,
                        "functional_domain": item.functional_domain,
                        "preconditions": json.loads(item.preconditions) if item.preconditions else [],
                        "steps": json.loads(item.steps) if item.steps else [],
                        "expected_result": json.loads(item.expected_result) if item.expected_result else [],
                        "remarks": item.remarks
                    },
                    "created_at": item.created_at.isoformat()
                })

            return EntityTestCasesResponse(
                entity_id=entity.id,
                entity_name=entity.name,
                test_cases=test_cases_data
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entity test cases: {str(e)}")


# ========================================
# TWO-STAGE TEST GENERATION ENDPOINTS
# ========================================

@main_router.post("/generate-test-points", response_model=GenerateResponse, tags=["test-cases"])
async def generate_test_points(
    request: GenerateTestCaseRequest,
    background_tasks: BackgroundTasks,
    project_id: Optional[int] = Query(None, description="Project ID to associate with the generation job"),
    db: Session = Depends(get_db)
):
    """
    Generate test points for a specific business type (Stage 1 of two-stage generation).

    Args:
        request: Generation request with business type
        background_tasks: FastAPI background tasks
        project_id: Optional project ID to associate with the generation job
        db: Database session

    Returns:
        GenerateResponse: Task information
    """
    # Validate business type (all business types now use two-stage mode)
    business_config = db.query(BusinessTypeConfig).filter(
        BusinessTypeConfig.code == request.business_type.upper(),
        BusinessTypeConfig.is_active == True
    ).first()

    if not business_config:
        raise HTTPException(
            status_code=400,
            detail=f"业务类型 '{request.business_type}' 不存在或未激活"
        )

    # Validate project ID
    project = validate_project_id(project_id, db, use_default=True)

    # Generate task ID
    task_id = str(uuid.uuid4())

    # Create generation job record
    job = GenerationJob(
        id=task_id,
        business_type=request.business_type.upper(),
        status=JobStatus.PENDING,
        project_id=project.id
    )
    db.add(job)
    db.commit()

    # Start background task
    background_tasks.add_task(
        generate_test_points_background,
        task_id=task_id,
        business_type=request.business_type.upper(),
        project_id=project.id
    )

    return GenerateResponse(
        task_id=task_id,
        status=JobStatus.PENDING.value,
        message=f"测试点生成任务已创建: {task_id}"
    )


@main_router.post("/generate-test-cases-from-points", response_model=GenerateResponse, tags=["test-cases"])
async def generate_test_cases_from_points(
    request: GenerateTestCasesFromPointsRequest,
    background_tasks: BackgroundTasks,
    project_id: Optional[int] = Query(None, description="Project ID to associate with the generation job"),
    db: Session = Depends(get_db)
):
    """
    Generate test cases from existing test points (Stage 2 of two-stage generation).

    Args:
        request: Generation request with business type and test points
        background_tasks: FastAPI background tasks
        project_id: Optional project ID to associate with the generation job
        db: Database session

    Returns:
        GenerateResponse: Task information
    """
    # Validate business type
    business_config = db.query(BusinessTypeConfig).filter(
        BusinessTypeConfig.code == request.business_type.upper(),
        BusinessTypeConfig.is_active == True
    ).first()

    if not business_config:
        raise HTTPException(
            status_code=400,
            detail=f"业务类型 '{request.business_type}' 不存在或未激活"
        )

    # Validate test points
    if not request.test_points or 'test_points' not in request.test_points:
        raise HTTPException(
            status_code=400,
            detail="无效的测试点数据"
        )

    # Validate project ID
    project = validate_project_id(project_id, db, use_default=True)

    # Generate task ID
    task_id = str(uuid.uuid4())

    # Create generation job record
    job = GenerationJob(
        id=task_id,
        business_type=request.business_type.upper(),
        status=JobStatus.PENDING,
        project_id=project.id
    )
    db.add(job)
    db.commit()

    # Start background task
    background_tasks.add_task(
        generate_test_cases_from_points_background,
        id=task_id,
        business_type=request.business_type.upper(),
        test_points=request.test_points,
        project_id=project.id
    )

    return GenerateResponse(
        id=task_id,
        status=JobStatus.PENDING,
        message=f"基于测试点的测试用例生成任务已创建: {task_id}"
    )


@main_router.post("/generate-test-cases-two-stage", response_model=GenerateResponse, tags=["test-cases"])
async def generate_test_cases_two_stage(
    request: GenerateTestCaseRequest,
    background_tasks: BackgroundTasks,
    project_id: Optional[int] = Query(None, description="Project ID to associate with the generation job"),
    db: Session = Depends(get_db)
):
    """
    Generate test cases using two-stage approach for a specific business type.

    Args:
        request: Generation request with business type
        background_tasks: FastAPI background tasks
        project_id: Optional project ID to associate with the generation job
        db: Database session

    Returns:
        GenerateResponse: Task information
    """
    # Validate business type
    business_config = db.query(BusinessTypeConfig).filter(
        BusinessTypeConfig.code == request.business_type.upper(),
        BusinessTypeConfig.is_active == True
    ).first()

    if not business_config:
        raise HTTPException(
            status_code=400,
            detail=f"业务类型 '{request.business_type}' 不存在或未激活"
        )

    # Validate project ID
    project = validate_project_id(project_id, db, use_default=True)

    # Generate task ID
    task_id = str(uuid.uuid4())

    # Create generation job record
    job = GenerationJob(
        id=task_id,
        business_type=request.business_type.upper(),
        status=JobStatus.PENDING,
        project_id=project.id
    )
    db.add(job)
    db.commit()

    # Start background task
    background_tasks.add_task(
        generate_test_cases_two_stage_background,
        task_id=task_id,
        business_type=request.business_type.upper(),
        project_id=project.id
    )

    return GenerateResponse(
        task_id=task_id,
        status=JobStatus.PENDING,
        message=f"两阶段测试生成任务已创建: {task_id}"
    )




@main_router.post("/business-types/{business_type}/configure", tags=["business-types"])
async def configure_business_type(
    business_type: str,
    config_request: SetBusinessTypeConfigRequest,
    db = Depends(get_db)
):
    """
    Configure the two-stage generation for a specific business type.

    Args:
        business_type: Business type code
        config_request: Request with combination IDs for two-stage generation
        db: Database session

    Returns:
        Success message
    """
    business_config = db.query(BusinessTypeConfig).filter(
        BusinessTypeConfig.code == business_type.upper(),
        BusinessTypeConfig.is_active == True
    ).first()

    if not business_config:
        raise HTTPException(
            status_code=404,
            detail=f"业务类型 '{business_type}' 不存在或未激活"
        )

    # Update the combination IDs
    business_config.test_point_combination_id = config_request.test_point_combination_id
    business_config.test_case_combination_id = config_request.test_case_combination_id

    business_config.updated_at = datetime.now()
    db.commit()

    return {
        "message": f"业务类型 '{business_type}' 的配置已更新",
        "business_type": business_type,
        "test_point_combination_id": business_config.test_point_combination_id,
        "test_case_combination_id": business_config.test_case_combination_id
    }


# ========================================
# BATCH TEST CASE GENERATION ENDPOINTS
# ========================================

# BatchTestCaseGenerationRequest is now imported from models.test_point


@main_router.post("/test-cases/batch/generate", response_model=Dict[str, Any], tags=["test-cases"])
async def batch_generate_test_cases(
    request: BatchTestCaseGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    project = Depends(get_current_project)
):
    """
    Batch generate test cases for multiple business types.

    Args:
        request: Batch generation request
        background_tasks: FastAPI BackgroundTasks
        db: Database session
        project: Current project

    Returns:
        Dict with task ID and status
    """
    # Validate business types
    for business_type in request.business_types:
        business_config = db.query(BusinessTypeConfig).filter(
            BusinessTypeConfig.code == business_type.upper(),
            BusinessTypeConfig.is_active == True
        ).first()

        if not business_config:
            raise HTTPException(
                status_code=400,
                detail=f"业务类型 '{business_type}' 不存在或未激活"
            )

    # Create task ID
    task_id = str(uuid.uuid4())

    # Create generation job record for each business type
    for business_type in request.business_types:
        job = GenerationJob(
            id=f"{task_id}-{business_type}",
            business_type=business_type.upper(),
            status=JobStatus.PENDING,
            project_id=project.id
        )
        db.add(job)

    db.commit()

    # Start background task for batch generation
    background_tasks.add_task(
        batch_generate_test_cases_background,
        task_id=task_id,
        business_types=request.business_types,
        additional_context=request.additional_context,
        project_id=project.id
    )

    return {
        "generation_id": task_id,
        "business_types": request.business_types,
        "status": "started",
        "message": f"批量测试用例生成任务已创建，涉及 {len(request.business_types)} 个业务类型"
    }


# ========================================
# ROUTER REGISTRATION - MOVED TO END
# ========================================
# This ensures all @main_router decorators are executed before registration

# Include routers with independent dependencies first
app.include_router(prompt_router)
app.include_router(config_router)
app.include_router(business_router)
app.include_router(test_point_router)
app.include_router(unified_test_case_router)
app.include_router(generation_router)
app.include_router(websocket_router)

# Include main router LAST - after all decorators have been executed
app.include_router(main_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)