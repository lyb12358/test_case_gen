"""
Pydantic models for business type management.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class BusinessTypeStatus(str, Enum):
    """Business type status."""
    INACTIVE = "inactive"
    ACTIVE = "active"


class ConfigurationStatus(str, Enum):
    """Configuration status for business type."""
    NONE = "none"        # 两个阶段都未配置
    PARTIAL = "partial"  # 只配置了一个阶段
    COMPLETE = "complete"  # 两个阶段都配置完成


class BusinessTypeCreate(BaseModel):
    """Business type creation model."""
    code: str = Field(..., description="Business type code", min_length=1, max_length=20)
    name: str = Field(..., description="Business type name", min_length=1, max_length=100)
    description: Optional[str] = Field(None, description="Business type description")
    project_id: int = Field(..., description="Associated project ID")


class BusinessTypeUpdate(BaseModel):
    """Business type update model."""
    name: Optional[str] = Field(None, description="Business type name", min_length=1, max_length=100)
    description: Optional[str] = Field(None, description="Business type description")
    project_id: Optional[int] = Field(None, description="Associated project ID")
    is_active: Optional[bool] = Field(None, description="Activation status")
    # Note: prompt_combination_id removed since it doesn't exist in database model
    test_point_combination_id: Optional[int] = Field(None, description="Test point generation combination ID")
    test_case_combination_id: Optional[int] = Field(None, description="Test case generation combination ID")


class BusinessTypeResponse(BaseModel):
    """Business type response model."""
    id: int
    code: str
    name: str
    description: Optional[str]
    project_id: int
    is_active: bool
    test_point_combination_id: Optional[int]
    test_case_combination_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    # Related data
    project_name: Optional[str] = None
    test_point_combination_name: Optional[str] = None
    test_case_combination_name: Optional[str] = None

    # Unified configuration status
    configuration_status: ConfigurationStatus
    has_valid_test_point_combination: bool = False
    has_valid_test_case_combination: bool = False

    model_config = ConfigDict(from_attributes=True)


class BusinessTypeListResponse(BaseModel):
    """Business type list response model."""
    items: List[BusinessTypeResponse]


class BusinessTypeActivationRequest(BaseModel):
    """Business type activation request model."""
    is_active: bool = Field(..., description="New activation status")
    validation_notes: Optional[str] = Field(None, description="Validation notes")


class PromptCombinationStatus(str, Enum):
    """Prompt combination status."""
    DRAFT = "draft"
    VALID = "valid"
    INVALID = "invalid"


class PromptCombinationItemCreate(BaseModel):
    """Prompt combination item creation model."""
    prompt_id: int = Field(..., description="Prompt ID")
    order: int = Field(0, description="Item order")
    variable_name: Optional[str] = Field(None, description="Variable name for template substitution")
    is_required: bool = Field(True, description="Whether this item is required")


class PromptCombinationItemUpdate(BaseModel):
    """Prompt combination item update model."""
    prompt_id: Optional[int] = Field(None, description="Prompt ID")
    order: Optional[int] = Field(None, description="Item order")
    variable_name: Optional[str] = Field(None, description="Variable name for template substitution")
    is_required: Optional[bool] = Field(None, description="Whether this item is required")


class PromptCombinationItemResponse(BaseModel):
    """Prompt combination item response model."""
    id: int
    combination_id: int
    prompt_id: int
    order: int
    variable_name: Optional[str]
    is_required: bool
    created_at: datetime

    # Related data
    prompt_name: Optional[str] = None
    prompt_type: Optional[str] = None
    prompt_content: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PromptCombinationCreate(BaseModel):
    """Prompt combination creation model."""
    name: str = Field(..., description="Combination name", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Combination description")
    project_id: int = Field(..., description="Project ID")
    business_type: Optional[str] = Field(None, description="Associated business type")
    items: Optional[List[PromptCombinationItemCreate]] = Field(None, description="Combination items")
    prompt_ids: Optional[List[int]] = Field(None, description="Prompt IDs (alternative format)")


class PromptCombinationUpdate(BaseModel):
    """Prompt combination update model."""
    name: Optional[str] = Field(None, description="Combination name", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Combination description")
    business_type: Optional[str] = Field(None, description="Associated business type")
    is_active: Optional[bool] = Field(None, description="Activation status")
    items: Optional[List[PromptCombinationItemUpdate]] = Field(None, description="Combination items")


class PromptCombinationResponse(BaseModel):
    """Prompt combination response model."""
    id: int
    name: str
    description: Optional[str]
    business_type: Optional[str]
    is_active: bool
    is_valid: bool
    validation_errors: Optional[str]
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Related data
    project_id: int
    project_name: Optional[str] = None
    items: List[PromptCombinationItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PromptCombinationListResponse(BaseModel):
    """Prompt combination list response model."""
    items: List[PromptCombinationResponse]
    total: int
    page: int
    size: int
    pages: int


class PromptCombinationPreviewRequest(BaseModel):
    """Prompt combination preview request model."""
    items: List[PromptCombinationItemCreate] = Field(..., description="Combination items to preview")
    variables: Optional[dict] = Field(None, description="Template variables")


class PromptCombinationPreviewResponse(BaseModel):
    """Prompt combination preview response model."""
    combined_prompt: str = Field(..., description="Combined prompt text")
    is_valid: bool = Field(..., description="Whether the combination is valid")
    validation_errors: List[str] = Field(default_factory=list, description="Validation errors")
    used_prompts: List[dict] = Field(default_factory=list, description="Information about used prompts")
    variables: List[str] = Field(default_factory=list, description="Template variables found in prompts")
    message: str = Field(default="", description="Status message")


class BusinessTypeStatsResponse(BaseModel):
    """Business type statistics response model."""
    total_business_types: int
    active_business_types: int
    inactive_business_types: int
    business_types_with_prompt_combinations: int
    business_types_without_prompt_combinations: int
    by_project: List[dict] = Field(default_factory=list)