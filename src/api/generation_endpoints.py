# -*- coding: utf-8 -*-
"""
统一的生成API端点。

提供标准化的两阶段测试用例生成API接口。
"""

import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..services.generation_service import UnifiedGenerationService
from ..utils.config import Config
from .dependencies import get_db
from ..models.generation import (
    TestCaseGenerationRequest,
    BatchGenerationRequest, GenerationResponse, TaskStatusResponse,
    CancelTaskResponse, HealthCheckResponse, GenerationStatisticsResponse
)
from ..models.unified_test_case import (
    UnifiedTestCaseGenerationRequest,
    UnifiedTestCaseGenerationResponse
)
from ..exceptions.generation import GenerationError, ErrorCode
from .decorators import standard_generation_endpoint

logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/api/v1/generation", tags=["generation"])

# 依赖注入
def get_generation_service() -> UnifiedGenerationService:
    """获取生成服务实例。"""
    return UnifiedGenerationService()




@router.post("/test-cases", response_model=GenerationResponse)
@standard_generation_endpoint
async def generate_test_cases(
    request: TestCaseGenerationRequest,
    service: UnifiedGenerationService = Depends(get_generation_service)
):
    """
    从测试点生成测试用例（第二阶段）。

    - **business_type**: 业务类型代码
    - **test_points**: 外部提供的测试点数据列表
    - **additional_context**: 额外的生成上下文
    - **save_to_database**: 是否保存到数据库
    - **project_id**: 项目ID（可选）
    """
    logger.info(f"开始生成测试用例 - 业务类型: {request.business_type}")

    response = service.generate_test_cases_from_points(
        business_type=request.business_type,
        test_points=request.test_points,
        test_point_ids=request.test_point_ids,
        additional_context=request.additional_context,
        save_to_database=request.save_to_database,
        project_id=request.project_id
    )

    logger.info(f"测试用例生成完成 - 任务ID: {response.task_id}")
    return response


@router.post("/batch", response_model=GenerationResponse)
async def batch_generate_test_points(
    request: BatchGenerationRequest,
    background_tasks: BackgroundTasks,
    service: UnifiedGenerationService = Depends(get_generation_service)
):
    """
    批量生成测试点。

    - **business_types**: 业务类型代码列表
    - **additional_context**: 额外的生成上下文
    - **save_to_database**: 是否保存到数据库
    """
    try:
        logger.info(f"开始批量生成测试点 - 业务类型: {request.business_types}")

        results = []
        total_success = 0
        total_failed = 0

        for business_type in request.business_types:
            try:
                response = service.generate_test_points(
                    business_type=business_type,
                    additional_context=request.additional_context,
                    save_to_database=request.save_to_database
                )
                results.append({
                    "business_type": business_type,
                    "success": True,
                    "task_id": response.task_id,
                    "message": response.message
                })
                total_success += 1

            except Exception as e:
                results.append({
                    "business_type": business_type,
                    "success": False,
                    "error": str(e)
                })
                total_failed += 1
                logger.error(f"批量生成中失败 - 业务类型: {business_type}, 错误: {e}")

        message = f"批量生成完成 - 成功: {total_success}, 失败: {total_failed}"

        return GenerationResponse(
            success=total_failed == 0,
            task_id=f"batch_{len(request.business_types)}",
            message=message,
            stage="batch",
            status="completed" if total_failed == 0 else "partial_failed",
            result=results
        )

    except Exception as e:
        logger.error(f"批量生成失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "批量生成失败",
                    "recoverable": True
                }
            }
        )


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
@standard_generation_endpoint
async def get_task_status(
    task_id: str,
    service: UnifiedGenerationService = Depends(get_generation_service)
):
    """
    获取任务状态。

    - **task_id**: 任务ID
    """
    logger.debug(f"查询任务状态 - 任务ID: {task_id}")

    status = service.get_task_status(task_id)
    return status


@router.post("/cancel/{task_id}", response_model=CancelTaskResponse)
async def cancel_task(
    task_id: str,
    service: UnifiedGenerationService = Depends(get_generation_service)
):
    """
    取消任务。

    - **task_id**: 任务ID
    """
    try:
        logger.info(f"取消任务 - 任务ID: {task_id}")

        success = service.cancel_task(task_id)

        if success:
            return CancelTaskResponse(
                success=True,
                message=f"任务 {task_id} 已成功取消"
            )
        else:
            return CancelTaskResponse(
                success=False,
                message=f"任务 {task_id} 无法取消（可能已完成或不存在）"
            )

    except Exception as e:
        logger.error(f"取消任务失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "取消任务失败",
                    "recoverable": True
                }
            }
        )


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    生成服务健康检查。
    """
    try:
        # 简单的健康检查
        service = UnifiedGenerationService()
        from datetime import datetime
        return HealthCheckResponse(
            status="healthy",
            service="generation",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return HealthCheckResponse(
            status="unhealthy",
            service="generation",
            error=str(e)
        )


@router.get("/statistics", response_model=GenerationStatisticsResponse)
async def get_generation_statistics(
    business_type: Optional[str] = Query(None, description="按业务类型筛选统计"),
    service: UnifiedGenerationService = Depends(get_generation_service)
):
    """
    获取生成统计信息。

    - **business_type**: 可选的业务类型筛选器
    """
    try:
        # 这里应该实现实际的统计逻辑
        # 暂时返回模拟数据
        return GenerationStatisticsResponse(
            total_generations=0,
            successful_generations=0,
            failed_generations=0,
            average_generation_time=0.0,
            business_type_stats={},
            last_generation=None
        )

    except Exception as e:
        logger.error(f"获取统计信息失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "获取统计信息失败",
                    "recoverable": True
                }
            }
        )


# full-two-stage 端点已移动到 unified_test_case_endpoints.py
# 为了避免循环依赖，该功能直接在 /api/v1/unified-test-cases/generate/full-two-stage 中实现
# 前端服务应该使用正确的路径