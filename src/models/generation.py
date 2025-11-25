# -*- coding: utf-8 -*-
"""
生成流程相关的数据模型。

定义统一的请求和响应模型，用于两阶段测试用例生成流程。
"""

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


class GenerationStage(str, Enum):
    """生成阶段枚举。"""
    TEST_POINT = "test_point"
    TEST_CASE = "test_case"
    COMPLETED = "completed"


class GenerationStatus(str, Enum):
    """生成状态枚举。"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Priority(str, Enum):
    """优先级枚举。"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TestPointRequest(BaseModel):
    """测试点请求模型。"""
    test_point_id: str = Field(..., description="测试点ID")
    title: str = Field(..., description="测试点标题")
    description: str = Field(..., description="测试点描述")
    priority: Priority = Field(Priority.MEDIUM, description="优先级")
    preconditions: Optional[List[str]] = Field(None, description="前置条件")


class TestPointGenerationRequest(BaseModel):
    """测试点生成请求模型。"""
    business_type: str = Field(..., description="业务类型")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="额外上下文")
    save_to_database: bool = Field(False, description="是否保存到数据库")
    project_id: Optional[int] = Field(None, description="项目ID")


class TestCaseGenerationRequest(BaseModel):
    """测试用例生成请求模型。"""
    business_type: str = Field(..., description="业务类型")
    test_points: List[TestPointRequest] = Field(..., description="测试点列表")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="额外上下文")
    save_to_database: bool = Field(False, description="是否保存到数据库")
    project_id: Optional[int] = Field(None, description="项目ID")
    test_point_ids: Optional[List[int]] = Field(None, description="数据库中的测试点ID列表")


class BatchGenerationRequest(BaseModel):
    """批量生成请求模型。"""
    business_types: List[str] = Field(..., description="业务类型列表")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="额外上下文")
    save_to_database: bool = Field(False, description="是否保存到数据库")


class GenerationProgress(BaseModel):
    """生成进度模型。"""
    stage: GenerationStage = Field(..., description="当前阶段")
    status: GenerationStatus = Field(..., description="当前状态")
    progress: float = Field(..., ge=0, le=100, description="进度百分比")
    current_step: str = Field(..., description="当前步骤描述")
    total_steps: int = Field(..., description="总步骤数")
    current_step_index: int = Field(..., description="当前步骤索引")
    estimated_remaining_time: Optional[int] = Field(None, description="预估剩余时间(秒)")
    warnings: List[str] = Field(default_factory=list, description="警告信息")


class GenerationResult(BaseModel):
    """生成结果模型。"""
    task_id: str = Field(..., description="任务ID")
    stage: GenerationStage = Field(..., description="生成阶段")
    status: GenerationStatus = Field(..., description="最终状态")
    business_type: str = Field(..., description="业务类型")
    project_id: Optional[int] = Field(None, description="项目ID")
    generated_items: List[Dict[str, Any]] = Field(default_factory=list, description="生成的项目")
    summary: Dict[str, Any] = Field(default_factory=dict, description="生成摘要")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="性能指标")
    warnings: List[str] = Field(default_factory=list, description="警告信息")
    errors: List[str] = Field(default_factory=list, description="错误信息")


class GenerationResponse(BaseModel):
    """统一的生成响应模型。"""
    success: bool = Field(..., description="是否成功")
    task_id: str = Field(..., description="任务ID")
    message: str = Field(..., description="响应消息")
    stage: GenerationStage = Field(..., description="生成阶段")
    status: GenerationStatus = Field(..., description="任务状态")
    progress: Optional[GenerationProgress] = Field(None, description="进度信息")
    result: Optional[GenerationResult] = Field(None, description="生成结果")
    can_retry: bool = Field(False, description="是否可以重试")
    retry_count: int = Field(0, description="当前重试次数")
    max_retries: int = Field(3, description="最大重试次数")


class TaskStatusResponse(BaseModel):
    """任务状态响应模型。"""
    task_id: str = Field(..., description="任务ID")
    stage: GenerationStage = Field(..., description="生成阶段")
    status: GenerationStatus = Field(..., description="任务状态")
    progress: GenerationProgress = Field(..., description="进度信息")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    started_at: Optional[str] = Field(None, description="开始时间")
    completed_at: Optional[str] = Field(None, description="完成时间")
    result: Optional[GenerationResult] = Field(None, description="生成结果")
    error: Optional[Dict[str, Any]] = Field(None, description="错误信息")


class GenerationStatistics(BaseModel):
    """生成统计模型。"""
    business_type: str = Field(..., description="业务类型")
    total_generations: int = Field(0, description="总生成次数")
    successful_generations: int = Field(0, description="成功生成次数")
    failed_generations: int = Field(0, description="失败生成次数")
    average_generation_time: float = Field(0, description="平均生成时间(秒)")
    last_generation_at: Optional[str] = Field(None, description="最后生成时间")
    popular_test_points: List[Dict[str, Any]] = Field(default_factory=list, description="热门测试点")


class ErrorResponse(BaseModel):
    """错误响应模型。"""
    success: bool = Field(False, description="是否成功")
    error: Dict[str, Any] = Field(..., description="错误详情")
    timestamp: str = Field(..., description="错误时间戳")
    path: str = Field(..., description="请求路径")


class CancelTaskResponse(BaseModel):
    """取消任务响应模型。"""
    success: bool = Field(..., description="是否成功取消")
    message: str = Field(..., description="取消结果消息")


class HealthCheckResponse(BaseModel):
    """健康检查响应模型。"""
    status: str = Field(..., description="服务状态：healthy/unhealthy")
    service: str = Field(..., description="服务名称")
    timestamp: Optional[str] = Field(None, description="检查时间戳")
    error: Optional[str] = Field(None, description="错误信息（仅在unhealthy时）")


class GenerationStatisticsResponse(BaseModel):
    """生成统计响应模型。"""
    total_generations: int = Field(0, description="总生成次数")
    successful_generations: int = Field(0, description="成功生成次数")
    failed_generations: int = Field(0, description="失败生成次数")
    average_generation_time: float = Field(0.0, description="平均生成时间(秒)")
    business_type_stats: Dict[str, Any] = Field(default_factory=dict, description="按业务类型统计")
    last_generation: Optional[str] = Field(None, description="最后生成时间")


# 向后兼容的别名和适配器
TestPointGenerationResponse = GenerationResponse
TestCaseGenerationResponse = GenerationResponse
BatchGenerationResponse = GenerationResponse