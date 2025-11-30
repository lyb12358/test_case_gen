# -*- coding: utf-8 -*-
"""
统一生成服务 - 前后端API适配层

提供与前端的统一生成服务兼容的接口，将前端调用转换为后端服务。
"""

import uuid
import time
import logging
from typing import List, Optional, Dict, Any, Tuple, Union
from datetime import datetime

from .generation_service import UnifiedGenerationService as BackendUnifiedGenerationService
from .base_service import BaseService
from ..database.models import UnifiedTestCase, Project
from ..models.unified_test_case import UnifiedTestCaseStatus
from ..utils.config import Config
from ..models.generation import (
    GenerationResponse, TaskStatusResponse
)
from ..exceptions.generation import (
    GenerationError, LLMError, handle_generation_error
)

logger = logging.getLogger(__name__)


class UnifiedGenerationService(BaseService):
    """
    统一生成服务 - 前端API适配层

    这个服务类提供与前端TypeScript服务兼容的接口，
    并将调用转发给后端的实际生成服务。
    """

    def __init__(self, config: Config = None):
        super().__init__(config)
        self.backend_service = BackendUnifiedGenerationService(config)

    # ========== 两阶段生成接口（前端期望的核心功能）==========

    async def generateTestPoints(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成测试点

        Args:
            request: 包含 business_type, project_id, additional_context 等字段

        Returns:
            Dict: 包含生成的测试点数据
        """
        try:
            # 转换前端请求格式为后端服务格式
            business_type = request.get('business_type')
            project_id = request.get('project_id')
            additional_context = request.get('additional_context', {})

            logger.info(f"Generating test points for business_type: {business_type}, project_id: {project_id}")

            # 调用后端生成服务
            result = await self.backend_service.generate_test_points(
                business_type=business_type,
                project_id=project_id,
                additional_context=additional_context,
                save_to_database=request.get('save_to_database', True),
                async_mode=request.get('async_mode', False)
            )

            # 转换响应格式为前端期望格式
            return {
                'success': True,
                'data': result,
                'message': f"成功生成 {len(result.get('test_points', []))} 个测试点"
            }

        except Exception as e:
            logger.error(f"Error generating test points: {str(e)}")
            return handle_generation_error(e)

    async def generateTestCasesFromPoints(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        基于测试点生成测试用例

        Args:
            request: 包含 business_type, test_point_ids, additional_context 等字段

        Returns:
            Dict: 包含生成的测试用例数据
        """
        try:
            # 转换前端请求格式
            business_type = request.get('business_type')
            test_point_ids = request.get('test_point_ids', [])
            additional_context = request.get('additional_context', {})
            project_id = request.get('project_id')

            logger.info(f"Generating test cases from {len(test_point_ids)} test points for business_type: {business_type}")

            # 调用后端生成服务
            result = await self.backend_service.generate_test_cases_from_points(
                business_type=business_type,
                test_points=[],  # 后端会通过test_point_ids获取
                test_point_ids=test_point_ids,
                additional_context=additional_context,
                save_to_database=request.get('save_to_database', True),
                project_id=project_id
            )

            return {
                'success': True,
                'data': result,
                'message': f"成功生成 {len(result.get('test_cases', []))} 个测试用例"
            }

        except Exception as e:
            logger.error(f"Error generating test cases from points: {str(e)}")
            return handle_generation_error(e)

    async def generateUnified(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        统一生成接口 - 支持测试点和测试用例两种模式

        Args:
            request: 统一生成请求

        Returns:
            Dict: 生成结果
        """
        try:
            generation_mode = request.get('generation_mode', 'test_points_only')
            business_type = request.get('business_type')
            project_id = request.get('project_id')
            test_point_ids = request.get('test_point_ids', [])
            additional_context = request.get('additional_context', '')

            logger.info(f"Unified generation - mode: {generation_mode}, business_type: {business_type}")

            if generation_mode == 'test_points_only':
                return await self.generateTestPoints(request)
            elif generation_mode == 'test_cases_only':
                return await self.generateTestCasesFromPoints(request)
            else:
                raise GenerationError(f"不支持的生成模式: {generation_mode}")

        except Exception as e:
            logger.error(f"Error in unified generation: {str(e)}")
            return handle_generation_error(e)

    # ========== 统一测试用例管理 ==========

    async def getUnifiedTestCases(self, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        获取统一测试用例列表

        Args:
            filters: 过滤条件

        Returns:
            Dict: 包含items、total、page等分页信息
        """
        try:
            # 提取过滤条件
            project_id = filters.get('project_id') if filters else None
            stage = filters.get('stage')
            status = filters.get('status')
            page = filters.get('page', 1)
            size = filters.get('size', 20)
            keyword = filters.get('keyword')
            sort_by = filters.get('sort_by', 'created_at')
            sort_order = filters.get('sort_order', 'desc')

            # 构建查询参数
            query_params = {}
            if project_id:
                query_params['project_id'] = project_id
            if stage:
                query_params['stage'] = stage
            if status:
                query_params['status'] = status
            if page:
                query_params['page'] = page
            if size:
                query_params['size'] = size
            if keyword:
                query_params['keyword'] = keyword
            if sort_by:
                query_params['sort_by'] = sort_by
            if sort_order:
                query_params['sort_order'] = sort_order

            # 调用后端服务
            result = await self.backend_service.get_unified_test_cases(query_params)

            # 转换为前端期望的格式
            return {
                'items': result.get('test_cases', []),
                'total': result.get('total', 0),
                'page': page,
                'size': size,
                'total_pages': result.get('total_pages', 0)
            }

        except Exception as e:
            logger.error(f"Error getting unified test cases: {str(e)}")
            return {
                'items': [],
                'total': 0,
                'page': page,
                'size': size,
                'total_pages': 0
            }

    async def createUnifiedTestCase(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建统一测试用例

        Args:
            data: 测试用例数据

        Returns:
            Dict: 创建结果
        """
        try:
            # 调用后端服务
            result = await self.backend_service.create_unified_test_case(data)

            return {
                'success': True,
                'data': result,
                'message': '测试用例创建成功'
            }

        except Exception as e:
            logger.error(f"Error creating unified test case: {str(e)}")
            return handle_generation_error(e)

    async def updateUnifiedTestCase(self, id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        更新统一测试用例

        Args:
            id: 测试用例ID
            data: 更新数据

        Returns:
            Dict: 更新结果
        """
        try:
            # 调用后端服务
            result = await self.backend_service.update_unified_test_case(id, data)

            return {
                'success': True,
                'data': result,
                'message': '测试用例更新成功'
            }

        except Exception as e:
            logger.error(f"Error updating unified test case: {str(e)}")
            return handle_generation_error(e)

    async def deleteUnifiedTestCase(self, id: int) -> Dict[str, Any]:
        """
        删除统一测试用例

        Args:
            id: 测试用例ID

        Returns:
            Dict: 删除结果
        """
        try:
            # 调用后端服务
            await self.backend_service.delete_unified_test_case(id)

            return {
                'success': True,
                'message': '测试用例删除成功'
            }

        except Exception as e:
            logger.error(f"Error deleting unified test case: {str(e)}")
            return handle_generation_error(e)

    # ========== 业务类型管理 ==========

    async def getBusinessTypes(self, project_id: int = None) -> Dict[str, Any]:
        """
        获取业务类型列表

        Args:
            project_id: 项目ID

        Returns:
            Dict: 业务类型列表
        """
        try:
            # 调用后端服务
            result = await self.backend_service.get_business_types(project_id)

            return {
                'items': result.get('business_types', []),
                'total': len(result.get('business_types', []))
            }

        except Exception as e:
            logger.error(f"Error getting business types: {str(e)}")
            return {
                'items': [],
                'total': 0
            }

    # ========== 生成任务管理 ==========

    async def getTaskStatus(self, task_id: str) -> Dict[str, Any]:
        """
        获取任务状态

        Args:
            task_id: 任务ID

        Returns:
            Dict: 任务状态信息
        """
        try:
            # 调用后端服务
            result = await self.backend_service.get_task_status(task_id)

            return result

        except Exception as e:
            logger.error(f"Error getting task status: {str(e)}")
            return {
                'task_id': task_id,
                'status': 'error',
                'error': str(e)
            }

    async def cancelTask(self, task_id: str) -> Dict[str, Any]:
        """
        取消任务

        Args:
            task_id: 任务ID

        Returns:
            Dict: 取消结果
        """
        try:
            # 调用后端服务
            result = await self.backend_service.cancel_task(task_id)

            return {
                'success': True,
                'message': '任务已取消'
            }

        except Exception as e:
            logger.error(f"Error cancelling task: {str(e)}")
            return {
                'success': False,
                'message': f'取消任务失败: {str(e)}'
            }

    # ========== 统计和分析 ==========

    async def getGenerationStatistics(self, project_id: int = None) -> Dict[str, Any]:
        """
        获取生成统计信息

        Args:
            project_id: 项目ID

        Returns:
            Dict: 统计信息
        """
        try:
            # 调用后端服务
            result = await self.backend_service.get_generation_statistics(project_id)

            return result

        except Exception as e:
            logger.error(f"Error getting generation statistics: {str(e)}")
            return {
                'total_test_points': 0,
                'total_test_cases': 0,
                'completed_jobs': 0,
                'failed_jobs': 0
            }

    # ========== 导出功能 ==========

    async def exportTestCases(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        导出测试用例

        Args:
            request: 导出请求

        Returns:
            Dict: 导出结果
        """
        try:
            # 调用后端服务
            export_job_id = await self.backend_service.export_test_cases(request)

            return {
                'success': True,
                'export_job_id': export_job_id,
                'message': '导出任务已创建'
            }

        except Exception as e:
            logger.error(f"Error exporting test cases: {str(e)}")
            return handle_generation_error(e)

    async def getExportStatus(self, export_job_id: str) -> Dict[str, Any]:
        """
        获取导出状态

        Args:
            export_job_id: 导出任务ID

        Returns:
            Dict: 导出状态
        """
        try:
            # 调用后端服务
            result = await self.backend_service.get_export_status(export_job_id)

            return result

        except Exception as e:
            logger.error(f"Error getting export status: {str(e)}")
            return {
                'export_job_id': export_job_id,
                'status': 'error',
                'error': str(e)
            }