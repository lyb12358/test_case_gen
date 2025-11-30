# -*- coding: utf-8 -*-
"""
统一生成服务API端点
提供与前端服务兼容的API接口，整合两阶段生成流程
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import logging

from ..services.unified_generation_service import UnifiedGenerationService
from ..services.base_service import BaseService
from ..utils.config import Config
from .dependencies import get_db

logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter(prefix="/api/v1/unified-generation", tags=["unified-generation"])

# 请求/响应模型
class TestPointsGenerationRequest(BaseModel):
    """测试点生成请求"""
    business_type: str
    project_id: int
    additional_context: Optional[Dict[str, Any]] = {}
    save_to_database: Optional[bool] = True
    async_mode: Optional[bool] = False

class TestCasesFromPointsRequest(BaseModel):
    """基于测试点生成测试用例请求"""
    business_type: str
    test_point_ids: List[int]
    project_id: int
    additional_context: Optional[Dict[str, Any]] = {}
    save_to_database: Optional[bool] = True

class UnifiedGenerationRequest(BaseModel):
    """统一生成请求"""
    business_type: str
    project_id: int
    generation_mode: str  # 'test_points_only' | 'test_cases_only'
    test_point_ids: Optional[List[int]] = []
    additional_context: Optional[str] = ""

class GenerationTaskStatusRequest(BaseModel):
    """任务状态查询请求"""
    task_id: str

class BusinessTypesRequest(BaseModel):
    """业务类型查询请求"""
    project_id: Optional[int] = None

# API端点实现
@router.post("/test-points/generate")
async def generate_test_points(
    request: TestPointsGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    生成测试点

    Args:
        request: 测试点生成请求
        background_tasks: 后台任务
        db: 数据库会话

    Returns:
        Dict: 生成结果
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        # 转换请求格式
        service_request = {
            'business_type': request.business_type,
            'project_id': request.project_id,
            'additional_context': request.additional_context,
            'save_to_database': request.save_to_database,
            'async_mode': request.async_mode
        }

        # 如果是异步模式，启动后台任务
        if request.async_mode:
            # 生成任务ID
            task_id = str(uuid.uuid4())

            # 启动后台任务
            background_tasks.add_task(
                _async_generate_test_points,
                task_id=task_id,
                request_data=service_request
            )

            return {
                'success': True,
                'task_id': task_id,
                'message': '测试点生成任务已启动'
            }
        else:
            # 同步执行
            result = await service.generateTestPoints(service_request)
            return result

    except Exception as e:
        logger.error(f"Error generating test points: {str(e)}")
        raise HTTPException(status_code=500, detail=f"测试点生成失败: {str(e)}")

@router.post("/test-cases/generate")
async def generate_test_cases_from_points(
    request: TestCasesFromPointsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    基于测试点生成测试用例

    Args:
        request: 测试用例生成请求
        background_tasks: 后台任务
        db: 数据库会话

    Returns:
        Dict: 生成结果
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        # 转换请求格式
        service_request = {
            'business_type': request.business_type,
            'test_point_ids': request.test_point_ids,
            'project_id': request.project_id,
            'additional_context': request.additional_context,
            'save_to_database': request.save_to_database
        }

        # 异步执行
        task_id = str(uuid.uuid4())

        # 启动后台任务
        background_tasks.add_task(
            _async_generate_test_cases_from_points,
            task_id=task_id,
            request_data=service_request
        )

        return {
            'success': True,
            'task_id': task_id,
            'message': '测试用例生成任务已启动'
        }

    except Exception as e:
        logger.error(f"Error generating test cases from points: {str(e)}")
        raise HTTPException(status_code=500, detail=f"测试用例生成失败: {str(e)}")

@router.post("/generate")
async def generate_unified(
    request: UnifiedGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    统一生成接口 - 支持测试点和测试用例两种模式

    Args:
        request: 统一生成请求
        background_tasks: 后台任务
        db: 数据库会话

    Returns:
        Dict: 生成结果
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        # 转换请求格式
        service_request = {
            'business_type': request.business_type,
            'project_id': request.project_id,
            'generation_mode': request.generation_mode,
            'test_point_ids': request.test_point_ids,
            'additional_context': request.additional_context
        }

        # 根据生成模式路由到不同处理函数
        if request.generation_mode == 'test_points_only':
            result = await service.generateTestPoints(service_request)
        elif request.generation_mode == 'test_cases_only':
            result = await service.generateTestCasesFromPoints(service_request)
        else:
            raise HTTPException(status_code=400, detail=f"不支持的生成模式: {request.generation_mode}")

        return result

    except Exception as e:
        logger.error(f"Error in unified generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"统一生成失败: {str(e)}")

@router.get("/test-cases")
async def get_unified_test_cases(
    project_id: Optional[int] = Query(None, description="项目ID"),
    stage: Optional[str] = Query(None, description="阶段"),
    status: Optional[str] = Query(None, description="状态"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页大小"),
    keyword: Optional[str] = Query(None, description="关键词"),
    sort_by: str = Query("created_at", description="排序字段"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="排序方向"),
    db: Session = Depends(get_db)
):
    """
    获取统一测试用例列表

    Args:
        project_id: 项目ID
        stage: 阶段过滤
        status: 状态过滤
        page: 页码
        size: 每页大小
        keyword: 关键词搜索
        sort_by: 排序字段
        sort_order: 排序方向
        db: 数据库会话

    Returns:
        Dict: 测试用例列表
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        # 构建过滤条件
        filters = {
            'project_id': project_id,
            'stage': stage,
            'status': status,
            'page': page,
            'size': size,
            'keyword': keyword,
            'sort_by': sort_by,
            'sort_order': sort_order
        }

        result = await service.getUnifiedTestCases(filters)
        return result

    except Exception as e:
        logger.error(f"Error getting unified test cases: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取测试用例列表失败: {str(e)}")

@router.post("/test-cases")
async def create_unified_test_case(
    request_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    创建统一测试用例

    Args:
        request_data: 测试用例数据
        db: 数据库会话

    Returns:
        Dict: 创建结果
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.createUnifiedTestCase(request_data)
        return result

    except Exception as e:
        logger.error(f"Error creating unified test case: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建测试用例失败: {str(e)}")

@router.put("/test-cases/{test_case_id}")
async def update_unified_test_case(
    test_case_id: int,
    request_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    更新统一测试用例

    Args:
        test_case_id: 测试用例ID
        request_data: 更新数据
        db: 数据库会话

    Returns:
        Dict: 更新结果
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.updateUnifiedTestCase(test_case_id, request_data)
        return result

    except Exception as e:
        logger.error(f"Error updating unified test case: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新测试用例失败: {str(e)}")

@router.delete("/test-cases/{test_case_id}")
async def delete_unified_test_case(
    test_case_id: int,
    db: Session = Depends(get_db)
):
    """
    删除统一测试用例

    Args:
        test_case_id: 测试用例ID
        db: 数据库会话

    Returns:
        Dict: 删除结果
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.deleteUnifiedTestCase(test_case_id)
        return result

    except Exception as e:
        logger.error(f"Error deleting unified test case: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除测试用例失败: {str(e)}")

@router.get("/business-types")
async def get_business_types(
    project_id: Optional[int] = Query(None, description="项目ID"),
    db: Session = Depends(get_db)
):
    """
    获取业务类型列表

    Args:
        project_id: 项目ID
        db: 数据库会话

    Returns:
        Dict: 业务类型列表
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.getBusinessTypes(project_id)
        return result

    except Exception as e:
        logger.error(f"Error getting business types: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取业务类型列表失败: {str(e)}")

@router.get("/tasks/{task_id}/status")
async def get_task_status(
    task_id: str,
    db: Session = Depends(get_db)
):
    """
    获取任务状态

    Args:
        task_id: 任务ID
        db: 数据库会话

    Returns:
        Dict: 任务状态
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.getTaskStatus(task_id)
        return result

    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取任务状态失败: {str(e)}")

@router.post("/tasks/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """
    取消任务

    Args:
        task_id: 任务ID
        db: 数据库会话

    Returns:
        Dict: 取消结果
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.cancelTask(task_id)
        return result

    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"取消任务失败: {str(e)}")

@router.get("/statistics")
async def get_generation_statistics(
    project_id: Optional[int] = Query(None, description="项目ID"),
    db: Session = Depends(get_db)
):
    """
    获取生成统计信息

    Args:
        project_id: 项目ID
        db: 数据库会话

    Returns:
        Dict: 统计信息
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.getGenerationStatistics(project_id)
        return result

    except Exception as e:
        logger.error(f"Error getting generation statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")

@router.post("/export")
async def export_test_cases(
    request_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    导出测试用例

    Args:
        request_data: 导出请求
        db: 数据库会话

    Returns:
        Dict: 导出结果
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.exportTestCases(request_data)
        return result

    except Exception as e:
        logger.error(f"Error exporting test cases: {str(e)}")
        raise HTTPException(status_code=500, detail=f"导出测试用例失败: {str(e)}")

@router.get("/export/{export_job_id}/status")
async def get_export_status(
    export_job_id: str,
    db: Session = Depends(get_db)
):
    """
    获取导出状态

    Args:
        export_job_id: 导出任务ID
        db: 数据库会话

    Returns:
        Dict: 导出状态
    """
    try:
        # 创建统一生成服务
        config = Config()
        service = UnifiedGenerationService(config)

        result = await service.getExportStatus(export_job_id)
        return result

    except Exception as e:
        logger.error(f"Error getting export status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取导出状态失败: {str(e)}")


# ========================================
# 异步后台任务函数
# ========================================

async def _async_generate_test_points(
    task_id: str,
    request_data: Dict[str, Any]
):
    """异步生成测试点后台任务"""
    try:
        config = Config()
        service = UnifiedGenerationService(config)

        # 执行生成
        result = await service.generateTestPoints(request_data)

        # 这里可以更新任务状态到数据库
        logger.info(f"Test points generation task {task_id} completed")

    except Exception as e:
        logger.error(f"Test points generation task {task_id} failed: {str(e)}")

async def _async_generate_test_cases_from_points(
    task_id: str,
    request_data: Dict[str, Any]
):
    """异步生成测试用例后台任务"""
    try:
        config = Config()
        service = UnifiedGenerationService(config)

        # 执行生成
        result = await service.generateTestCasesFromPoints(request_data)

        # 这里可以更新任务状态到数据库
        logger.info(f"Test cases generation task {task_id} completed")

    except Exception as e:
        logger.error(f"Test cases generation task {task_id} failed: {str(e)}")