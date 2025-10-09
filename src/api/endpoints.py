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
from datetime import datetime

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


class TestCaseResponse(BaseModel):
    """Response model for test case data."""
    id: int
    business_type: str
    test_cases: List[Dict[str, Any]] = []
    created_at: str
    updated_at: Optional[str] = None


class TestCasesListResponse(BaseModel):
    """Response model for list of test cases."""
    business_type: Optional[str] = None
    count: int
    test_cases: List[TestCaseResponse]


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
    business_entities: int
    service_entities: int
    interface_entities: int


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
    allow_origins=["http://localhost:5173", "http://localhost:5175"],  # Frontend URLs
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
            "DELETE /knowledge-graph/clear - Clear all knowledge graph data"
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
    # Get job from database
    with db_manager.get_session() as db:
        from ..database.models import GenerationJob
        job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get additional progress info from memory if available
    progress_info = task_progress.get(task_id, {})

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
        TestCasesListResponse: List of test cases for the business type
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

    # Get test cases from database
    generator = TestCaseGenerator(config)
    test_cases = generator.get_test_cases_from_database(business_type)

    if test_cases is None:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve test cases from database"
        )

    # Convert to response format
    test_case_responses = []
    for tc in test_cases:
        # Extract test_cases from test_data if it exists
        test_data = tc["test_data"]
        test_cases_list = test_data.get("test_cases", []) if isinstance(test_data, dict) else []

        test_case_responses.append(TestCaseResponse(
            id=tc["id"],
            business_type=tc["business_type"],
            test_cases=test_cases_list,
            created_at=tc["created_at"],
            updated_at=tc["updated_at"]
        ))

    return TestCasesListResponse(
        business_type=business_enum.value,
        count=len(test_case_responses),
        test_cases=test_case_responses
    )


@app.get("/test-cases", response_model=TestCasesListResponse)
async def get_all_test_cases():
    """
    Get all test cases from all business types.

    Returns:
        TestCasesListResponse: List of all test cases
    """
    # Get all test cases from database
    generator = TestCaseGenerator(config)
    test_cases = generator.get_test_cases_from_database()

    if test_cases is None:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve test cases from database"
        )

    # Convert to response format
    test_case_responses = []
    for tc in test_cases:
        # Extract test_cases from test_data if it exists
        test_data = tc["test_data"]
        test_cases_list = test_data.get("test_cases", []) if isinstance(test_data, dict) else []

        test_case_responses.append(TestCaseResponse(
            id=tc["id"],
            business_type=tc["business_type"],
            test_cases=test_cases_list,
            created_at=tc["created_at"],
            updated_at=tc["updated_at"]
        ))

    return TestCasesListResponse(
        business_type=None,
        count=len(test_case_responses),
        test_cases=test_case_responses
    )


@app.delete("/test-cases/{business_type}")
async def delete_test_cases_by_business_type(business_type: str):
    """
    Delete all test cases for a specific business type.

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

    # Delete test cases from database
    generator = TestCaseGenerator(config)
    success = generator.delete_test_cases_from_database(business_type)

    if not success:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete test cases for {business_enum.value}"
        )

    return {
        "message": f"Test cases for {business_enum.value} deleted successfully"
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
    # Get all jobs from database
    with db_manager.get_session() as db:
        from ..database.models import GenerationJob
        jobs = db.query(GenerationJob).all()

    tasks = []
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

        # Get the created test case ID
        test_cases = generator.get_test_cases_from_database(business_type)
        if test_cases and len(test_cases) > 0:
            task_progress[task_id]["test_case_id"] = test_cases[0]["id"]

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
        with db_manager.get_session() as db:
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

            # Get graph data
            graph_data = db_operations.get_knowledge_graph_data(business_enum)

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)