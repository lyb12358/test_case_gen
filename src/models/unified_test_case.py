# -*- coding: utf-8 -*-
"""
Unified test case Pydantic models for API request/response serialization.

Represents both test points and test cases as the same entity at different stages:
- test_point: Initial stage with basic information (test_case_id + name + description)
- test_case: Complete stage with execution steps and details

They share the same id and test_case_id, differentiated only by the 'stage' field.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum
from src.validators.json_validators import JSONFieldValidator


class UnifiedTestCaseStatus(str, Enum):
    """Unified test case status for workflow management."""
    DRAFT = "draft"                    # Initial draft, needs review
    APPROVED = "approved"              # Approved and ready for test case generation
    COMPLETED = "completed"            # Test case fully completed with steps


class UnifiedTestCaseStage(str, Enum):
    """Test case stage to distinguish between test point and test case."""
    TEST_POINT = "test_point"          # Test point stage (basic info only)
    TEST_CASE = "test_case"            # Test case stage (with execution details)


# Base models
class UnifiedTestCaseBase(BaseModel):
    """Base unified test case model with common fields."""
    name: str = Field(..., min_length=1, max_length=200, description="测试用例名称")
    description: str = Field(..., min_length=1, max_length=2000, description="测试用例描述")
    priority: str = Field("medium", pattern="^(low|medium|high)$", description="优先级")
    status: UnifiedTestCaseStatus = Field(UnifiedTestCaseStatus.DRAFT, description="状态")


# Request models
class UnifiedTestCaseCreate(UnifiedTestCaseBase):
    """Unified test case creation model."""
    project_id: int = Field(..., gt=0, description="项目ID")
    business_type: str = Field(..., min_length=1, max_length=10, description="业务类型")
    test_case_id: str = Field(..., min_length=1, max_length=50, description="测试用例ID")

    # Test case specific fields (optional for test point stage)
    module: Optional[str] = Field(None, max_length=100, description="功能模块")
    functional_module: Optional[str] = Field(None, max_length=100, description="功能子模块")
    functional_domain: Optional[str] = Field(None, max_length=100, description="功能域")

    # Execution details (JSON format, optional for test point stage)
    preconditions: Optional[str] = Field(None, max_length=5000, description="前置条件")
    steps: Optional[List[Dict[str, Any]]] = Field(None, description="执行步骤")
    # Note: expected_result is removed - use expected field in steps instead
    remarks: Optional[str] = Field(None, max_length=2000, description="备注")

    # Metadata
    entity_order: Optional[float] = Field(None, description="排序顺序")

    
    @field_validator('steps')
    @classmethod
    def validate_steps(cls, v):
        return JSONFieldValidator.validate_steps(v)

    # expected_result field validation removed - field is removed from model


class UnifiedTestCaseUpdate(BaseModel):
    """Unified test case update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="测试用例名称")
    description: Optional[str] = Field(None, max_length=2000, description="测试用例描述")
    business_type: Optional[str] = Field(None, min_length=1, max_length=20, description="业务类型")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$", description="优先级")
    status: Optional[UnifiedTestCaseStatus] = Field(None, description="状态")

    # Test case specific fields
    module: Optional[str] = Field(None, max_length=100, description="功能模块")
    functional_module: Optional[str] = Field(None, max_length=100, description="功能子模块")
    functional_domain: Optional[str] = Field(None, max_length=100, description="功能域")

    # Execution details
    preconditions: Optional[str] = Field(None, max_length=5000, description="前置条件")
    steps: Optional[List[Dict[str, Any]]] = Field(None, description="执行步骤")
    # Note: expected_result is removed - use expected field in steps instead
    remarks: Optional[str] = Field(None, max_length=2000, description="备注")

    # Metadata
    entity_order: Optional[float] = Field(None, description="排序顺序")

    
    @field_validator('steps')
    @classmethod
    def validate_steps(cls, v):
        return JSONFieldValidator.validate_steps(v)

    # expected_result field validation removed - field is removed from model


# Response models
class UnifiedTestCaseResponse(UnifiedTestCaseBase):
    """Unified test case response model."""
    id: int = Field(..., description="测试用例ID")
    project_id: int = Field(..., description="项目ID")
    business_type: str = Field(..., description="业务类型")
    case_id: str = Field(..., alias="test_case_id", description="测试用例ID")
    test_case_id: str = Field(..., description="测试用例ID（与case_id相同，用于前端兼容）")

    # Stage information
    stage: UnifiedTestCaseStage = Field(..., description="当前阶段")

    # Test case specific fields (may be null for test point stage)
    module: Optional[str] = Field(None, description="功能模块")
    functional_module: Optional[str] = Field(None, description="功能子模块")
    functional_domain: Optional[str] = Field(None, description="功能域")

    # Execution details
    preconditions: Optional[str] = Field(None, max_length=5000, description="前置条件")
    steps: Optional[List[Dict[str, Any]]] = Field(None, description="执行步骤")
    # Note: expected_result is removed - use expected field in steps instead
    remarks: Optional[str] = Field(None, description="备注")

    # Metadata
    generation_job_id: Optional[str] = Field(None, description="生成任务ID")
    entity_order: Optional[float] = Field(None, description="排序顺序")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UnifiedTestCaseListResponse(BaseModel):
    """Unified test case list response model."""
    items: List[UnifiedTestCaseResponse] = Field(..., description="测试用例列表")
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    size: int = Field(..., description="每页大小")
    pages: int = Field(..., description="总页数")


class UnifiedTestCaseFilter(BaseModel):
    """Unified test case filter parameters."""
    project_id: Optional[int] = Field(None, description="项目ID")
    business_type: Optional[str] = Field(None, description="业务类型")
    status: Optional[UnifiedTestCaseStatus] = Field(None, description="状态")
    stage: Optional[UnifiedTestCaseStage] = Field(None, description="阶段")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$", description="优先级")
    keyword: Optional[str] = Field(None, description="关键词搜索")

    # Pagination
    page: int = Field(1, ge=1, description="页码")
    size: int = Field(20, ge=1, le=100, description="每页大小")

    # Sorting
    sort_by: str = Field("created_at", description="排序字段")
    sort_order: str = Field("desc", pattern="^(asc|desc)$", description="排序方向")


class UnifiedTestCaseStatistics(BaseModel):
    """Unified test case statistics model."""
    total_count: int = Field(..., description="总数量")
    test_point_count: int = Field(..., description="测试点阶段数量")
    test_case_count: int = Field(..., description="测试用例阶段数量")
    status_distribution: Dict[str, int] = Field(..., description="状态分布")
    business_type_distribution: Dict[str, int] = Field(..., description="业务类型分布")
    priority_distribution: Dict[str, int] = Field(..., description="优先级分布")


class UnifiedTestCaseBatchOperation(BaseModel):
    """Unified test case batch operation model."""
    test_case_ids: List[int] = Field(..., min_items=1, description="测试用例ID列表")
    operation: str = Field(..., pattern="^(delete|update_status|update_priority)$", description="操作类型")

    # Operation-specific parameters
    status: Optional[UnifiedTestCaseStatus] = Field(None, description="新状态（用于状态更新）")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$", description="新优先级（用于优先级更新）")


class UnifiedTestCaseBatchResponse(BaseModel):
    """Unified test case batch operation response."""
    success_count: int = Field(..., description="成功操作数量")
    failed_count: int = Field(..., description="失败操作数量")
    failed_items: List[Dict[str, Any]] = Field(..., description="失败项目详情")


# Specialized generation models
class UnifiedTestCaseGenerationRequest(BaseModel):
    """Unified test case generation request."""
    project_id: int = Field(..., gt=0, description="项目ID")
    business_type: str = Field(..., description="业务类型")

    # Generation mode: test_points_only or test_cases_only
    generation_mode: str = Field(..., pattern="^(test_points_only|test_cases_only)$", description="生成模式")

    # Test point IDs (required for test_cases_only mode)
    test_point_ids: Optional[List[int]] = Field(None, description="测试点ID列表（仅用于test_cases_only模式）")

    # Additional context as simple string
    additional_context: Optional[str] = Field(None, max_length=2000, description="额外上下文")


class UnifiedTestCaseGenerationResponse(BaseModel):
    """Unified test case generation response."""
    generation_job_id: str = Field(..., description="生成任务ID")
    status: str = Field(..., description="任务状态")
    test_points_generated: int = Field(..., description="生成的测试点数量")
    test_cases_generated: int = Field(..., description="生成的测试用例数量")
    unified_test_cases: Optional[List[UnifiedTestCaseResponse]] = Field(None, description="生成的测试用例列表")
    generation_time: Optional[float] = Field(None, description="生成耗时（秒）")
    message: str = Field(..., description="状态消息")


class UnifiedTestCaseDeleteResponse(BaseModel):
    """Response model for delete operations."""
    message: str