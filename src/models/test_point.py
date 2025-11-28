"""
Data models for test point management system.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator

# Define literal types for type hints
TestPointStatusLiteral = Literal[
    "draft", "approved", "modified", "completed"
]
PriorityLiteral = Literal[
    "high", "medium", "low"
]


# Base Models
class BaseTestPointModel(BaseModel):
    """Base model for test point-related objects."""

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class TestPointBase(BaseTestPointModel):
    """Base model for test points."""
    project_id: int = Field(..., description="Project ID")
    business_type: str = Field(..., description="Associated business type")

    # Test point information
    title: str = Field(..., description="Test point title", min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, description="Test point description")
    priority: str = Field(default="medium", description="Priority level")

    
    # Generation metadata
    generation_job_id: Optional[str] = Field(default=None, description="Associated generation job ID")
    llm_metadata: Optional[Dict[str, Any]] = Field(default=None, description="LLM generation metadata")


class TestPointCreate(TestPointBase):
    """Model for creating test points."""
    test_point_id: Optional[str] = Field(None, description="Test point identifier (auto-generated if not provided)", min_length=1, max_length=50)

    @field_validator('test_point_id', mode='before')
    @classmethod
    def generate_test_point_id(cls, v):
        """Generate test_point_id if not provided."""
        if v is None or v == '' or str(v).strip() == '':
            import time
            import random
            timestamp = int(time.time())
            random_suffix = random.randint(1000, 9999)
            return f"TP-{timestamp}-{random_suffix}"
        return v

    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        """Validate priority field."""
        if v not in ['high', 'medium', 'low']:
            raise ValueError(f"Priority must be one of: high, medium, low. Got: {v}")
        return v


class TestPointUpdate(BaseTestPointModel):
    """Model for updating test points."""
    title: Optional[str] = Field(default=None, description="Test point title", min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, description="Test point description")
    priority: Optional[str] = Field(default=None, description="Priority level")
    status: Optional[str] = Field(default=None, description="Test point status")
    llm_metadata: Optional[Dict[str, Any]] = Field(default=None, description="LLM generation metadata")


class TestPoint(TestPointBase):
    """Complete test point model with database fields."""
    id: int = Field(..., description="Test point ID")
    test_point_id: str = Field(..., description="Test point identifier")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class TestPointSummary(BaseTestPointModel):
    """Summary model for test point lists."""
    id: int = Field(..., description="Test point ID")
    project_id: int = Field(..., description="Project ID")
    business_type: str = Field(..., description="Associated business type")
    test_point_id: str = Field(..., description="Test point identifier")
    title: str = Field(..., description="Test point title")
    description: Optional[str] = Field(default=None, description="Test point description")
    priority: str = Field(..., description="Priority level")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # Additional summary fields
    test_case_count: Optional[int] = Field(default=0, description="Number of associated test cases")
    last_test_case_date: Optional[datetime] = Field(default=None, description="Last test case generation date")


# Request/Response Models
class TestPointListResponse(BaseModel):
    """Response model for test point lists."""
    items: List[TestPointSummary] = Field(..., description="Test point items")
    total: int = Field(..., description="Total number of test points")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")


class TestPointSearchRequest(BaseModel):
    """Request model for test point search."""
    query: Optional[str] = Field(default=None, description="Search query")
    business_type: Optional[str] = Field(default=None, description="Filter by business type")
    status: Optional[str] = Field(default=None, description="Filter by status")
    priority: Optional[str] = Field(default=None, description="Filter by priority")
    project_id: Optional[int] = Field(default=None, description="Filter by project")
    generation_job_id: Optional[str] = Field(default=None, description="Filter by generation job")
    page: int = Field(default=1, description="Page number", ge=1)
    size: int = Field(default=20, description="Page size", ge=1, le=100)


class TestPointValidationResponse(BaseModel):
    """Response model for test point validation."""
    is_valid: bool = Field(..., description="Whether test point is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")


class TestPointStatusUpdate(BaseModel):
    """Request model for updating test point status."""
    status: str = Field(..., description="New status")
    notes: Optional[str] = Field(default=None, description="Status change notes")


class BatchTestPointOperation(BaseModel):
    """Request model for batch operations."""
    test_point_ids: List[int] = Field(..., description="Test point IDs to operate on")
    operation: str = Field(..., description="Operation type (approve, archive, delete, etc.)")
    parameters: Optional[Dict[str, Any]] = Field(default=None, description="Operation parameters")


class BatchTestPointOperationResponse(BaseModel):
    """Response model for batch operations."""
    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    errors: List[str] = Field(default_factory=list, description="Operation errors")


class TestPointGenerationRequest(BaseModel):
    """Request model for generating test cases from test points."""
    test_point_ids: List[int] = Field(..., description="Test point IDs to generate test cases for")
    generation_config: Optional[Dict[str, Any]] = Field(default=None, description="Generation configuration")
    regenerate_existing: bool = Field(default=False, description="Whether to regenerate existing test cases")


class TestPointGenerationResponse(BaseModel):
    """Response model for test case generation from test points."""
    task_id: str = Field(..., description="Generation task ID")
    message: str = Field(..., description="Generation status message")
    test_points_count: int = Field(..., description="Number of test points submitted for generation")


# Statistics Models
class TestPointStatistics(BaseModel):
    """Test point usage statistics."""
    total_test_points: int = Field(..., description="Total number of test points")
    draft_test_points: int = Field(..., description="Number of draft test points")
    approved_test_points: int = Field(..., description="Number of approved test points")
    modified_test_points: int = Field(..., description="Number of modified test points")
    completed_test_points: int = Field(..., description="Number of completed test points")

    test_points_by_business_type: Dict[str, int] = Field(..., description="Test points grouped by business type")
    test_points_by_priority: Dict[str, int] = Field(..., description="Test points grouped by priority")
    test_points_by_status: Dict[str, int] = Field(..., description="Test points grouped by status")

    recent_activity: List[TestPointSummary] = Field(..., description="Recently updated test points")
    most_recent: List[TestPointSummary] = Field(..., description="Most recently updated test points")


# Test Case Generation Models
class TestCaseFromTestPointRequest(BaseModel):
    """Request model for generating a single test case from a test point."""
    test_point_id: int = Field(..., description="Test point ID")
    generation_config: Optional[Dict[str, Any]] = Field(default=None, description="Generation configuration")


class TestCaseFromTestPointResponse(BaseModel):
    """Response model for single test case generation."""
    test_case_id: str = Field(..., description="Generated test case ID")
    test_case_content: Dict[str, Any] = Field(..., description="Generated test case content")
    generation_metadata: Dict[str, Any] = Field(..., description="Generation metadata")


# Batch Generation Models
class BatchTestCaseGenerationRequest(BaseModel):
    """Request model for batch test case generation."""
    business_types: List[str] = Field(..., description="List of business type codes to generate test cases for")
    additional_context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context for generation")


class BatchTestPointGenerationRequest(BaseModel):
    """Request model for batch test point generation."""
    business_types: List[str] = Field(..., description="List of business type codes to generate test points for")
    additional_context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context for generation")
    save_to_database: bool = Field(default=False, description="Whether to save test points to database")
    project_id: Optional[int] = Field(default=None, description="Project ID for database saving")


class BatchGenerationResponse(BaseModel):
    """Response model for batch generation operations."""
    generation_id: str = Field(..., description="Unique generation job identifier")
    business_types: List[str] = Field(..., description="List of business types submitted for generation")
    status: str = Field(..., description="Generation status")
    message: str = Field(..., description="Status message")