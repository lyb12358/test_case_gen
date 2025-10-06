"""
API endpoints for test case generation service using FastAPI.
Refactored to support business type parameters and database integration.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import uuid
import os

from ..core.test_case_generator import TestCaseGenerator
from ..utils.config import Config
from ..database.database import DatabaseManager
from ..database.operations import DatabaseOperations
from ..database.models import BusinessType, JobStatus


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
    test_data: Dict[str, Any]
    created_at: str
    updated_at: str


class TestCasesListResponse(BaseModel):
    """Response model for list of test cases."""
    business_type: Optional[str] = None
    count: int
    test_cases: List[TestCaseResponse]


class BusinessTypeResponse(BaseModel):
    """Response model for business types."""
    business_types: List[str]


# Initialize FastAPI app
app = FastAPI(
    title="TSP Test Case Generator API",
    description="API for generating test cases using LLMs with business type support",
    version="2.0.0"
)

# Configuration and database
config = Config()
db_manager = DatabaseManager(config)

# Global task storage (in production, use Redis or database)
task_store: Dict[str, Dict[str, Any]] = {}


def get_db_operations() -> DatabaseOperations:
    """Dependency to get database operations."""
    # This will be properly implemented with dependency injection
    # For now, we'll create a new session each time
    pass


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "TSP Test Case Generator API v2.0",
        "description": "API for generating test cases using LLMs with business type support",
        "endpoints": [
            "POST /generate-test-cases - Generate test cases for business type",
            "GET /test-cases/{business_type} - Get test cases by business type",
            "GET /test-cases - Get all test cases",
            "DELETE /test-cases/{business_type} - Delete test cases by business type",
            "GET /business-types - List supported business types"
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

    # Initialize task status
    task_store[task_id] = {
        "status": JobStatus.PENDING.value,
        "progress": 0,
        "business_type": business_enum.value,
        "error": None,
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
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found")

    task = task_store[task_id]
    return TaskStatusResponse(
        task_id=task_id,
        status=task["status"],
        progress=task.get("progress"),
        business_type=task.get("business_type"),
        error=task.get("error"),
        test_case_id=task.get("test_case_id")
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
        test_case_responses.append(TestCaseResponse(
            id=tc["id"],
            business_type=tc["business_type"],
            test_data=tc["test_data"],
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
        test_case_responses.append(TestCaseResponse(
            id=tc["id"],
            business_type=tc["business_type"],
            test_data=tc["test_data"],
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
    return {
        "tasks": [
            {
                "task_id": task_id,
                "status": task["status"],
                "progress": task.get("progress"),
                "business_type": task.get("business_type"),
                "error": task.get("error")
            }
            for task_id, task in task_store.items()
        ]
    }


@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """
    Delete a task from the task store.

    Args:
        task_id: Task identifier

    Returns:
        Dict: Deletion result
    """
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found")

    del task_store[task_id]
    return {"message": "Task deleted successfully"}


async def generate_test_cases_background(task_id: str, business_type: str):
    """
    Background task for test case generation.

    Args:
        task_id: Task identifier
        business_type: Business type for generation
    """
    try:
        # Update status to running
        task_store[task_id]["status"] = JobStatus.RUNNING.value
        task_store[task_id]["progress"] = 10

        # Initialize generator
        generator = TestCaseGenerator(config)
        task_store[task_id]["progress"] = 30

        # Generate test cases
        test_cases_data = generator.generate_test_cases_for_business(business_type)
        if test_cases_data is None:
            raise Exception("Failed to generate test cases")

        task_store[task_id]["progress"] = 70

        # Save to database (automatically deletes old data)
        if not generator.save_to_database(test_cases_data, business_type):
            raise Exception("Failed to save test cases to database")

        task_store[task_id]["progress"] = 90

        # Get the created test case ID
        test_cases = generator.get_test_cases_from_database(business_type)
        if test_cases and len(test_cases) > 0:
            task_store[task_id]["test_case_id"] = test_cases[0]["id"]

        # Update completion status
        task_store[task_id].update({
            "status": JobStatus.COMPLETED.value,
            "progress": 100,
            "error": None
        })

    except Exception as e:
        task_store[task_id].update({
            "status": JobStatus.FAILED.value,
            "error": str(e)
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)