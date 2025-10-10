"""
API endpoints for test case generation service using FastAPI.
Refactored to support business type parameters and database integration.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import uuid
import os
import json
from datetime import datetime
from sqlalchemy import func

from ..core.test_case_generator import TestCaseGenerator
from ..utils.config import Config
from ..database.database import DatabaseManager
from ..database.operations import DatabaseOperations
from ..database.models import BusinessType, JobStatus, EntityType
from ..core.business_data_extractor import BusinessDataExtractor


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
    business_type: Optional[str] = None
    error: Optional[str] = None
    test_case_id: Optional[int] = None


class TestCaseItemResponse(BaseModel):
    """Response model for individual test case item."""
    id: int
    group_id: int
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
    business_type: str
    generation_metadata: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: Optional[str] = None
    test_case_items: List[TestCaseItemResponse] = []


class TestCasesListResponse(BaseModel):
    """Response model for list of test cases."""
    business_type: Optional[str] = None
    count: int
    test_case_groups: List[TestCaseGroupResponse]


class BusinessTypeResponse(BaseModel):
    """Response model for business types."""
    business_types: List[str]


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


# Initialize FastAPI app
app = FastAPI(
    title="TSP Test Case Generator API",
    description="API for generating test cases using LLMs with business type support",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration and database
config = Config()
db_manager = DatabaseManager(config)

# Task progress data (for additional metadata during execution)
task_progress: Dict[str, Dict[str, Any]] = {}


def get_db_operations():
    """Dependency to get database operations."""
    # Create a new session for database operations
    return db_manager.get_session().__enter__()


@app.get("/")
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
            "GET /business-types - List supported business types",
            "GET /knowledge-graph/data - Get knowledge graph data for visualization",
            "GET /knowledge-graph/entities - Get knowledge graph entities",
            "GET /knowledge-graph/relations - Get knowledge graph relations",
            "GET /knowledge-graph/stats - Get knowledge graph statistics",
            "POST /knowledge-graph/initialize - Initialize knowledge graph from business descriptions",
            "DELETE /knowledge-graph/clear - Clear all knowledge graph data",
            "POST /knowledge-graph/fix-duplicate-test-cases - Fix duplicate test case names"
        ]
    }


@app.post("/generate-test-cases", response_model=GenerateResponse)
async def generate_test_cases_for_business(
    request: GenerateTestCaseRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate test cases for a specific business type.

    Args:
        request: Generation request with business type
        background_tasks: FastAPI background tasks

    Returns:
        GenerateResponse: Task information
    """
    # Validate business type
    try:
        business_enum = BusinessType(request.business_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid business type '{request.business_type}'. "
                   f"Supported types: {[bt.value for bt in BusinessType]}"
        )

    # Generate task ID
    task_id = str(uuid.uuid4())

    # Create job in database
    with db_manager.get_session() as db:
        db_operations = DatabaseOperations(db)
        job = db_operations.create_generation_job(task_id, business_enum)

    # Initialize task progress for real-time updates
    task_progress[task_id] = {
        "progress": 0,
        "test_case_id": None
    }

    # Add background task
    background_tasks.add_task(
        generate_test_cases_background,
        task_id,
        business_enum.value
    )

    return GenerateResponse(
        task_id=task_id,
        status=JobStatus.PENDING.value,
        message=f"Test case generation started for {business_enum.value}"
    )


@app.get("/status/{task_id}", response_model=TaskStatusResponse)
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
        from ..database.models import GenerationJob
        job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()

        if not job:
            raise HTTPException(status_code=404, detail="Task not found")

        return TaskStatusResponse(
            task_id=task_id,
            status=job.status.value,
            progress=progress_info.get("progress"),
            business_type=job.business_type.value,
            error=job.error_message,
            test_case_id=progress_info.get("test_case_id")
        )


@app.get("/test-cases/{business_type}", response_model=TestCasesListResponse)
async def get_test_cases_by_business_type(business_type: str):
    """
    Get test cases for a specific business type.

    Args:
        business_type: Business type (RCC, RFD, ZAB, ZBA)

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

    # Get test case groups from database
    with db_manager.get_session() as db:
        from ..database.models import TestCaseGroup, TestCaseItem
        db_operations = DatabaseOperations(db)

        # Get test case groups for this business type
        groups = db.query(TestCaseGroup).filter(
            TestCaseGroup.business_type == business_enum
        ).order_by(TestCaseGroup.created_at.desc()).all()

        # Convert to response format
        group_responses = []
        for group in groups:
            # Get test case items for this group
            items = db.query(TestCaseItem).filter(
                TestCaseItem.group_id == group.id
            ).order_by(TestCaseItem.entity_order.asc()).all()

            # Convert items to response format
            item_responses = []
            for item in items:
                # Parse JSON fields
                preconditions = json.loads(item.preconditions) if item.preconditions else []
                steps = json.loads(item.steps) if item.steps else []
                expected_result = json.loads(item.expected_result) if item.expected_result else []

                item_responses.append(TestCaseItemResponse(
                    id=item.id,
                    group_id=item.group_id,
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

            group_responses.append(TestCaseGroupResponse(
                id=group.id,
                business_type=group.business_type.value,
                generation_metadata=generation_metadata,
                created_at=group.created_at.isoformat(),
                updated_at=group.updated_at.isoformat() if group.updated_at else None,
                test_case_items=item_responses
            ))

        return TestCasesListResponse(
            business_type=business_enum.value,
            count=len(group_responses),
            test_case_groups=group_responses
        )


@app.get("/test-cases", response_model=TestCasesListResponse)
async def get_all_test_cases():
    """
    Get all test cases from all business types.

    Returns:
        TestCasesListResponse: List of all test case groups
    """
    # Get all test case groups from database
    with db_manager.get_session() as db:
        from ..database.models import TestCaseGroup, TestCaseItem
        db_operations = DatabaseOperations(db)

        # Get all test case groups
        groups = db.query(TestCaseGroup).order_by(TestCaseGroup.created_at.desc()).all()

        # Convert to response format
        group_responses = []
        for group in groups:
            # Get test case items for this group
            items = db.query(TestCaseItem).filter(
                TestCaseItem.group_id == group.id
            ).order_by(TestCaseItem.entity_order.asc()).all()

            # Convert items to response format
            item_responses = []
            for item in items:
                # Parse JSON fields
                preconditions = json.loads(item.preconditions) if item.preconditions else []
                steps = json.loads(item.steps) if item.steps else []
                expected_result = json.loads(item.expected_result) if item.expected_result else []

                item_responses.append(TestCaseItemResponse(
                    id=item.id,
                    group_id=item.group_id,
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

            group_responses.append(TestCaseGroupResponse(
                id=group.id,
                business_type=group.business_type.value,
                generation_metadata=generation_metadata,
                created_at=group.created_at.isoformat(),
                updated_at=group.updated_at.isoformat() if group.updated_at else None,
                test_case_items=item_responses
            ))

        return TestCasesListResponse(
            business_type=None,
            count=len(group_responses),
            test_case_groups=group_responses
        )


@app.delete("/test-cases/{business_type}")
async def delete_test_cases_by_business_type(business_type: str):
    """
    Delete all test cases for a specific business type, including knowledge graph entities and relations.

    Args:
        business_type: Business type (RCC, RFD, ZAB, ZBA)

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
        from ..database.models import (TestCaseGroup, TestCaseItem, TestCaseEntity,
                                     KnowledgeEntity, KnowledgeRelation, EntityType)
        groups = db.query(TestCaseGroup).filter(
            TestCaseGroup.business_type == business_enum
        ).all()

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
            items = db.query(TestCaseItem).filter(
                TestCaseItem.group_id == group.id
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


@app.get("/business-types", response_model=BusinessTypeResponse)
async def get_business_types():
    """
    Get list of supported business types.

    Returns:
        BusinessTypeResponse: List of supported business types
    """
    business_types = [bt.value for bt in BusinessType]
    return BusinessTypeResponse(business_types=business_types)


@app.get("/tasks")
async def list_tasks():
    """
    List all tasks and their status.

    Returns:
        Dict: List of all tasks
    """
    tasks = []
    # Get all jobs from database and access all properties within the session
    with db_manager.get_session() as db:
        from ..database.models import GenerationJob
        jobs = db.query(GenerationJob).all()

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


@app.delete("/tasks/{task_id}")
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
            raise HTTPException(status_code=404, detail="Task not found")
        db.delete(job)
        db.commit()

    # Clean up progress info
    if task_id in task_progress:
        del task_progress[task_id]

    return {"message": "Task deleted successfully"}


async def generate_test_cases_background(task_id: str, business_type: str):
    """
    Background task for test case generation.

    Args:
        task_id: Task identifier
        business_type: Business type for generation
    """
    try:
        # Update status to running in database
        with db_manager.get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.RUNNING
                db.commit()

        # Update progress in memory
        task_progress[task_id]["progress"] = 10

        # Initialize generator
        generator = TestCaseGenerator(config)
        task_progress[task_id]["progress"] = 30

        # Generate test cases
        test_cases_data = generator.generate_test_cases_for_business(business_type)
        if test_cases_data is None:
            raise Exception("Failed to generate test cases")

        task_progress[task_id]["progress"] = 70

        # Save to database (automatically deletes old data)
        if not generator.save_to_database(test_cases_data, business_type):
            raise Exception("Failed to save test cases to database")

        task_progress[task_id]["progress"] = 90

        # Get the created test case group ID
        with db_manager.get_session() as db:
            from ..database.models import TestCaseGroup
            group = db.query(TestCaseGroup).filter(
                TestCaseGroup.business_type == BusinessType(business_type.upper())
            ).order_by(TestCaseGroup.created_at.desc()).first()

            if group:
                task_progress[task_id]["test_case_id"] = group.id

        # Update completion status in database
        with db_manager.get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.utcnow()
                db.commit()

        task_progress[task_id]["progress"] = 100

    except Exception as e:
        # Update failed status in database
        with db_manager.get_session() as db:
            from ..database.models import GenerationJob, JobStatus
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                db.commit()

        # Clean up progress info
        if task_id in task_progress:
            del task_progress[task_id]


# Knowledge Graph Endpoints

@app.get("/knowledge-graph/data", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph_data(business_type: Optional[str] = None):
    """
    Get knowledge graph data for visualization.

    Args:
        business_type (Optional[str]): Filter by business type

    Returns:
        KnowledgeGraphResponse: Graph data in G6 format
    """
    try:
        # 添加调试日志
        print(f"API: get_knowledge_graph_data called with business_type: {business_type}")

        with db_manager.get_session() as db:
            db_operations = DatabaseOperations(db)

            # Parse business type if provided
            business_enum = None
            if business_type:
                try:
                    business_enum = BusinessType(business_type.upper())
                    print(f"API: Parsed business_type '{business_type}' to enum: {business_enum}")
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid business type '{business_type}'. "
                               f"Supported types: {[bt.value for bt in BusinessType]}"
                    )

            # Get graph data
            graph_data = db_operations.get_knowledge_graph_data(business_enum)
            print(f"API: Retrieved graph data with {len(graph_data['nodes'])} nodes and {len(graph_data['edges'])} edges")

            # Convert to response format
            nodes = [GraphNode(**node) for node in graph_data["nodes"]]
            edges = [GraphEdge(**edge) for edge in graph_data["edges"]]

            return KnowledgeGraphResponse(nodes=nodes, edges=edges)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get knowledge graph data: {str(e)}")


@app.get("/knowledge-graph/entities", response_model=List[GraphEntityResponse])
async def get_knowledge_entities(entity_type: Optional[str] = None, business_type: Optional[str] = None):
    """
    Get knowledge graph entities.

    Args:
        entity_type (Optional[str]): Filter by entity type (business, service, interface)
        business_type (Optional[str]): Filter by business type

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

            # Get entities
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


@app.get("/knowledge-graph/relations", response_model=List[GraphRelationResponse])
async def get_knowledge_relations(business_type: Optional[str] = None):
    """
    Get knowledge graph relations.

    Args:
        business_type (Optional[str]): Filter by business type

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

            # Get relations
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


@app.get("/knowledge-graph/stats", response_model=GraphStatsResponse)
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


@app.post("/knowledge-graph/initialize")
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


@app.delete("/knowledge-graph/clear")
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


@app.get("/knowledge-graph/entities/{entity_id}/details", response_model=EntityDetailsResponse)
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
                # Handle both legacy test_case and new test_case_item relationships
                if tc_entity.test_case_item:
                    # New structure - get data from TestCaseItem
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
                elif tc_entity.test_case:
                    # Legacy structure - get data from TestCase
                    test_cases_data.append({
                        "id": tc_entity.test_case.id,
                        "name": tc_entity.name,
                        "description": tc_entity.description,
                        "test_data": json.loads(tc_entity.test_case.test_data) if tc_entity.test_case.test_data else {},
                        "created_at": tc_entity.test_case.created_at.isoformat()
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


@app.get("/knowledge-graph/entities/{entity_id}/business-description", response_model=BusinessDescriptionResponse)
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


@app.get("/knowledge-graph/entities/{entity_id}/test-cases", response_model=EntityTestCasesResponse)
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
                # Handle both legacy test_case and new test_case_item relationships
                if tc_entity.test_case_item:
                    # New structure - get data from TestCaseItem
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
                elif tc_entity.test_case:
                    # Legacy structure - get data from TestCase
                    test_cases_data.append({
                        "id": tc_entity.test_case.id,
                        "name": tc_entity.name,
                        "description": tc_entity.description,
                        "test_data": json.loads(tc_entity.test_case.test_data) if tc_entity.test_case.test_data else {},
                        "created_at": tc_entity.test_case.created_at.isoformat()
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


@app.post("/knowledge-graph/fix-duplicate-test-cases")
async def fix_duplicate_test_cases():
    """
    Fix duplicate test case names in the database by renaming duplicates with suffixes.
    This resolves the discrepancy between Dashboard test case counts and Knowledge Graph node counts.

    Returns:
        Dict: Statistics about the fix operation
    """
    try:
        with db_manager.get_session() as db:
            from ..database.models import KnowledgeEntity, TestCaseEntity, TestCaseItem, EntityType

            # Find duplicate test case entities (grouped by name and business_type)
            duplicates_query = db.query(
                KnowledgeEntity.name,
                KnowledgeEntity.business_type,
                func.count(KnowledgeEntity.id).label('count')
            ).filter(
                KnowledgeEntity.type == EntityType.TEST_CASE
            ).group_by(
                KnowledgeEntity.name,
                KnowledgeEntity.business_type
            ).having(
                func.count(KnowledgeEntity.id) > 1
            ).all()

            if not duplicates_query:
                return {
                    "message": "No duplicate test case names found",
                    "duplicate_groups_fixed": 0,
                    "entities_renamed": 0
                }

            total_groups_fixed = 0
            total_entities_renamed = 0

            # Process each duplicate group
            for duplicate in duplicates_query:
                name = duplicate.name
                business_type = duplicate.business_type

                print(f"Processing duplicate group: '{name}' for {business_type.value}")

                # Get all entities with this name and business_type, ordered by creation date
                entities = db.query(KnowledgeEntity).filter(
                    KnowledgeEntity.name == name,
                    KnowledgeEntity.business_type == business_type,
                    KnowledgeEntity.type == EntityType.TEST_CASE
                ).order_by(KnowledgeEntity.created_at.asc()).all()

                # Keep the first one as-is, rename the rest
                for i, entity in enumerate(entities[1:], 1):  # Skip first entity
                    new_name = f"{name}_{i}"
                    print(f"  Renaming entity {entity.id}: '{name}' -> '{new_name}'")

                    # Update the knowledge entity name
                    entity.name = new_name

                    # Update corresponding TestCaseEntity records
                    tc_entities = db.query(TestCaseEntity).filter(
                        TestCaseEntity.entity_id == entity.id
                    ).all()

                    for tc_entity in tc_entities:
                        tc_entity.name = new_name

                    # Update corresponding TestCaseItem records if needed
                    # Check if this knowledge entity is linked to any TestCaseItem via extra_data
                    if entity.extra_data:
                        try:
                            import json
                            extra_data = json.loads(entity.extra_data)
                            test_case_item_id = extra_data.get("test_case_item_id")
                            if test_case_item_id:
                                # Update the TestCaseItem name as well
                                tc_item = db.query(TestCaseItem).filter(
                                    TestCaseItem.id == test_case_item_id
                                ).first()
                                if tc_item:
                                    tc_item.name = new_name
                                    print(f"  Updated TestCaseItem {tc_item.id} name to '{new_name}'")
                        except json.JSONDecodeError:
                            pass

                    total_entities_renamed += 1

                total_groups_fixed += 1

            # Commit all changes
            db.commit()

            return {
                "message": f"Fixed duplicate test case names successfully",
                "duplicate_groups_fixed": total_groups_fixed,
                "entities_renamed": total_entities_renamed,
                "details": [
                    {
                        "name": dup.name,
                        "business_type": dup.business_type.value,
                        "count": dup.count
                    } for dup in duplicates_query
                ]
            }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fix duplicate test cases: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)