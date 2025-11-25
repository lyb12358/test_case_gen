"""
Data models for prompt management system.

This module uses dynamic configuration service to validate enum values
instead of hardcoded enums, establishing database-driven architecture.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union, Literal
from pydantic import BaseModel, Field, field_validator, ConfigDict

# Import configuration service for validation
from src.services.config_service import config_service

# Define literal types for type hints (these are for documentation only)
# Actual validation is done through the configuration service
PromptTypeLiteral = Literal[
    "system", "template", "business_description", "shared_content", "requirements"
]
PromptStatusLiteral = Literal[
    "draft", "active", "archived", "deprecated"
]
GenerationStageLiteral = Literal[
    "test_point", "test_case", "general"
]


# Base Models
class BasePromptModel(BaseModel):
    """Base model for prompt-related objects."""

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class PromptCategoryBase(BasePromptModel):
    """Base model for prompt categories."""
    name: str = Field(..., description="Category name", min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, description="Category description")
    parent_id: Optional[int] = Field(default=None, description="Parent category ID")
    order: float = Field(default=0.0, description="Display order")


class PromptCategoryCreate(PromptCategoryBase):
    """Model for creating prompt categories."""
    pass


class PromptCategoryUpdate(BasePromptModel):
    """Model for updating prompt categories."""
    name: Optional[str] = Field(default=None, description="Category name", min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, description="Category description")
    parent_id: Optional[int] = Field(default=None, description="Parent category ID")
    order: Optional[float] = Field(default=None, description="Display order")


class PromptCategory(PromptCategoryBase):
    """Complete prompt category model."""
    id: int = Field(..., description="Category ID")
    created_at: datetime = Field(..., description="Creation timestamp")


class PromptBase(BasePromptModel):
    """Base model for prompts."""
    project_id: int = Field(..., description="Project ID")
    name: str = Field(..., description="Prompt name", min_length=1, max_length=200)
    content: str = Field(..., description="Prompt content", min_length=0)
    type: str = Field(..., description="Prompt type")
    business_type: Optional[str] = Field(default=None, description="Associated business type")
    status: str = Field(default="draft", description="Prompt status")
    generation_stage: Optional[str] = Field(default=None, description="Generation stage type")

    # Metadata
    author: Optional[str] = Field(default=None, description="Author name", max_length=100)
    version: str = Field(default="1.0.0", description="Version number")
    tags: Optional[List[str]] = Field(default=None, description="Tags for categorization")
    variables: Optional[List[str]] = Field(default=None, description="Template variables")
    extra_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    # Organization
    category_id: Optional[int] = Field(default=None, description="Category ID")
    file_path: Optional[str] = Field(default=None, description="Original file path")

    @field_validator('type')
    @classmethod
    def validate_prompt_type(cls, v):
        if not config_service.validate_prompt_type(v):
            raise ValueError(f"Invalid prompt type: {v}")
        return v

    @field_validator('business_type')
    @classmethod
    def validate_business_type(cls, v):
        if v is not None and not config_service.validate_business_type(v):
            raise ValueError(f"Invalid business type: {v}")
        return v

    @field_validator('status')
    @classmethod
    def validate_prompt_status(cls, v):
        if not config_service.validate_prompt_status(v):
            raise ValueError(f"Invalid prompt status: {v}")
        return v


class PromptCreate(PromptBase):
    """Model for creating prompts."""
    pass


class PromptUpdate(BasePromptModel):
    """Model for updating prompts."""
    name: Optional[str] = Field(default=None, description="Prompt name", min_length=1, max_length=200)
    content: Optional[str] = Field(default=None, description="Prompt content", min_length=1)
    type: Optional[str] = Field(default=None, description="Prompt type")
    business_type: Optional[str] = Field(default=None, description="Associated business type")
    status: Optional[str] = Field(default=None, description="Prompt status")

    # Metadata
    author: Optional[str] = Field(default=None, description="Author name", max_length=100)
    version: Optional[str] = Field(default=None, description="Version number")
    tags: Optional[List[str]] = Field(default=None, description="Tags for categorization")
    variables: Optional[List[str]] = Field(default=None, description="Template variables")
    extra_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    # Organization
    category_id: Optional[int] = Field(default=None, description="Category ID")

    @field_validator('type')
    @classmethod
    def validate_prompt_type(cls, v):
        if v is not None and not config_service.validate_prompt_type(v):
            raise ValueError(f"Invalid prompt type: {v}")
        return v

    @field_validator('business_type')
    @classmethod
    def validate_business_type(cls, v):
        if v is not None and not config_service.validate_business_type(v):
            raise ValueError(f"Invalid business type: {v}")
        return v

    @field_validator('status')
    @classmethod
    def validate_prompt_status(cls, v):
        if v is not None and not config_service.validate_prompt_status(v):
            raise ValueError(f"Invalid prompt status: {v}")
        return v


class Prompt(PromptBase):
    """Complete prompt model with database fields."""
    id: int = Field(..., description="Prompt ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # Related objects
    category: Optional[PromptCategory] = Field(default=None, description="Associated category")


class PromptSummary(BasePromptModel):
    """Summary model for prompt lists."""
    id: int = Field(..., description="Prompt ID")
    project_id: int = Field(..., description="Project ID")
    project_name: Optional[str] = Field(default=None, description="Project name")
    name: str = Field(..., description="Prompt name")
    type: str = Field(..., description="Prompt type")
    business_type: Optional[str] = Field(default=None, description="Associated business type")
    status: str = Field(..., description="Prompt status")
    generation_stage: Optional[str] = Field(default=None, description="Generation stage type")
    author: Optional[str] = Field(default=None, description="Author name")
    version: str = Field(..., description="Version number")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    category: Optional[PromptCategory] = Field(default=None, description="Associated category")


class PromptVersionBase(BasePromptModel):
    """Base model for prompt versions."""
    project_id: int = Field(..., description="Project ID")
    version_number: str = Field(..., description="Version number")
    content: str = Field(..., description="Version content", min_length=1)
    changelog: Optional[str] = Field(default=None, description="Change description")
    created_by: Optional[str] = Field(default=None, description="Creator name", max_length=100)


class PromptVersionCreate(PromptVersionBase):
    """Model for creating prompt versions."""
    prompt_id: int = Field(..., description="Parent prompt ID")


class PromptVersion(PromptVersionBase):
    """Complete prompt version model."""
    id: int = Field(..., description="Version ID")
    prompt_id: int = Field(..., description="Parent prompt ID")
    created_at: datetime = Field(..., description="Creation timestamp")


class PromptTemplateBase(BasePromptModel):
    """Base model for prompt templates."""
    project_id: int = Field(..., description="Project ID")
    name: str = Field(..., description="Template name", min_length=1, max_length=200)
    template_content: str = Field(..., description="Template content", min_length=1)
    description: Optional[str] = Field(default=None, description="Template description")
    variables: Optional[List[str]] = Field(default=None, description="Template variables")


class PromptTemplateCreate(PromptTemplateBase):
    """Model for creating prompt templates."""
    pass


class PromptTemplateUpdate(BasePromptModel):
    """Model for updating prompt templates."""
    name: Optional[str] = Field(default=None, description="Template name", min_length=1, max_length=200)
    template_content: Optional[str] = Field(default=None, description="Template content", min_length=1)
    description: Optional[str] = Field(default=None, description="Template description")
    variables: Optional[List[str]] = Field(default=None, description="Template variables")


class PromptTemplate(PromptTemplateBase):
    """Complete prompt template model."""
    id: int = Field(..., description="Template ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


# Request/Response Models
class PromptListResponse(BaseModel):
    """Response model for prompt lists."""
    items: List[PromptSummary] = Field(..., description="Prompt items")
    total: int = Field(..., description="Total number of prompts")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")


class PromptSearchRequest(BaseModel):
    """Request model for prompt search."""
    query: Optional[str] = Field(default=None, description="Search query")
    type: Optional[str] = Field(default=None, description="Filter by type")
    business_type: Optional[str] = Field(default=None, description="Filter by business type")
    status: Optional[str] = Field(default=None, description="Filter by status")
    generation_stage: Optional[str] = Field(default=None, description="Filter by generation stage")
    category_id: Optional[int] = Field(default=None, description="Filter by category")
    tags: Optional[List[str]] = Field(default=None, description="Filter by tags")
    author: Optional[str] = Field(default=None, description="Filter by author")
    project_id: Optional[int] = Field(default=None, description="Filter by project ID")
    page: int = Field(default=1, description="Page number", ge=1)
    size: int = Field(default=20, description="Page size", ge=1, le=100)




class PromptValidationResponse(BaseModel):
    """Response model for prompt validation."""
    is_valid: bool = Field(..., description="Whether prompt is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")


class PromptExportRequest(BaseModel):
    """Request model for prompt export."""
    prompt_ids: Optional[List[int]] = Field(default=None, description="Specific prompt IDs to export")
    type: Optional[str] = Field(default=None, description="Filter by type")
    business_type: Optional[str] = Field(default=None, description="Filter by business type")
    format: str = Field(default="json", description="Export format (json, csv, xlsx)")
    include_versions: bool = Field(default=False, description="Include version history")


class PromptImportRequest(BaseModel):
    """Request model for prompt import."""
    file_path: str = Field(..., description="Import file path")
    overwrite: bool = Field(default=False, description="Overwrite existing prompts")
    category_id: Optional[int] = Field(default=None, description="Default category for imported prompts")


class PromptImportResponse(BaseModel):
    """Response model for prompt import."""
    imported_count: int = Field(..., description="Number of prompts imported")
    updated_count: int = Field(..., description="Number of prompts updated")
    skipped_count: int = Field(..., description="Number of prompts skipped")
    errors: List[str] = Field(default_factory=list, description="Import errors")


class BatchPromptOperation(BaseModel):
    """Request model for batch operations."""
    prompt_ids: List[int] = Field(..., description="Prompt IDs to operate on")
    operation: str = Field(..., description="Operation type (activate, archive, delete, etc.)")
    parameters: Optional[Dict[str, Any]] = Field(default=None, description="Operation parameters")


class BatchPromptOperationResponse(BaseModel):
    """Response model for batch operations."""
    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    errors: List[str] = Field(default_factory=list, description="Operation errors")


# Statistics Models
class PromptStatistics(BaseModel):
    """Prompt usage statistics."""
    total_prompts: int = Field(..., description="Total number of prompts")
    active_prompts: int = Field(..., description="Number of active prompts")
    draft_prompts: int = Field(..., description="Number of draft prompts")
    archived_prompts: int = Field(..., description="Number of archived prompts")

    prompts_by_type: Dict[str, int] = Field(..., description="Prompts grouped by type")
    prompts_by_business_type: Dict[str, int] = Field(..., description="Prompts grouped by business type")
    prompts_by_generation_stage: Dict[str, int] = Field(..., description="Prompts grouped by generation stage")
    recent_activity: List[PromptSummary] = Field(..., description="Recently updated prompts")
    most_recent: List[PromptSummary] = Field(..., description="Most recently updated prompts")


# Preview Models
class PromptPreviewRequest(BaseModel):
    """Request model for prompt preview."""
    name: str = Field(..., description="Prompt name", min_length=1, max_length=200)
    content: str = Field(..., description="Prompt content", min_length=1)
    type: str = Field(..., description="Prompt type")
    business_type: Optional[str] = Field(default=None, description="Associated business type")
    generation_stage: Optional[str] = Field(default=None, description="Generation stage")
    variables: Optional[Dict[str, Any]] = Field(default=None, description="Template variables for preview")


class PromptPreviewResponse(BaseModel):
    """Response model for prompt preview."""
    rendered_content: str = Field(..., description="Rendered prompt content")
    estimated_tokens: int = Field(..., description="Estimated token count")
    preview_metadata: Dict[str, Any] = Field(..., description="Preview metadata")
    validation_warnings: List[str] = Field(default_factory=list, description="Validation warnings")