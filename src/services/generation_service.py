# -*- coding: utf-8 -*-
"""
统一的生成服务，处理两阶段测试用例生成流程。

提供统一的接口来管理测试点生成和测试用例生成的完整流程。
"""

import uuid
import time
import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

from ..database.database import DatabaseManager
from ..database.models import (
    UnifiedTestCase, UnifiedTestCaseStage, GenerationJob, JobStatus,
    BusinessTypeConfig, Project
)
# TestPointGenerator removed - using unified generation system
from ..core.test_case_generator import TestCaseGenerator
from ..utils.config import Config
from ..models.generation import (
    GenerationStage, GenerationStatus, GenerationProgress,
    GenerationResult, GenerationResponse, TaskStatusResponse
)
from ..models.unified_test_case import UnifiedTestCaseStatus
from ..exceptions.generation import (
    GenerationError, LLMError, BusinessTypeError,
    ValidationError, handle_generation_error
)
import asyncio

logger = logging.getLogger(__name__)


class UnifiedGenerationService:
    """统一的生成服务类。"""

    def __init__(self, config: Config = None):
        """
        初始化生成服务。

        Args:
            config: 配置对象
        """
        self.config = config or Config()
        self.db_manager = DatabaseManager(self.config)
        self.test_case_generator = TestCaseGenerator(self.config)
        self.active_jobs: Dict[str, Dict[str, Any]] = {}

    def validate_business_type(self, business_type: str) -> BusinessTypeConfig:
        """
        验证业务类型是否有效且活跃。

        Args:
            business_type: 业务类型代码

        Returns:
            BusinessTypeConfig实例

        Raises:
            BusinessTypeError: 业务类型无效或不活跃
        """
        with self.db_manager.get_session() as db:
            business_config = db.query(BusinessTypeConfig).filter(
                BusinessTypeConfig.code == business_type.upper(),
                BusinessTypeConfig.is_active == True
            ).first()

            if not business_config:
                raise BusinessTypeError(
                    f"业务类型 '{business_type}' 不存在或已停用",
                    business_type=business_type,
                    is_inactive=True
                )

            return business_config

    def generate_test_points(
        self,
        business_type: str,
        additional_context: Optional[Dict[str, Any]] = None,
        save_to_database: bool = False,
        project_id: Optional[int] = None,
        task_id: Optional[str] = None,
        ai_logger=None
    ) -> GenerationResponse:
        """
        生成测试点（第一阶段）。

        Args:
            business_type: 业务类型
            additional_context: 额外上下文
            save_to_database: 是否保存到数据库
            project_id: 项目ID
            task_id: 任务ID（由API端点传入）

        Returns:
            生成响应

        Raises:
            GenerationError: 生成失败时抛出
        """
        # 如果没有传入task_id，创建一个（保持向后兼容）
        if not task_id:
            task_id = str(uuid.uuid4())

        start_time = time.time()

        try:
            # 验证业务类型
            business_config = self.validate_business_type(business_type)

            # 记录业务类型配置到AI日志
            if ai_logger:
                try:
                    business_config_data = {
                        "business_type": business_type,
                        "business_config": {
                            "id": business_config.id if hasattr(business_config, 'id') else None,
                            "name": getattr(business_config, 'name', None),
                            "description": getattr(business_config, 'description', None)
                        }
                    }
                    ai_logger.log_business_type_config(business_config_data)
                except Exception as log_error:
                    logger.warning(f"Failed to log business type config: {log_error}")

            # 注意：不再在这里创建任务记录，由API端点负责
            # 这样可以避免重复任务创建的问题

              # 获取测试点生成的提示词（ID=87）
            system_prompt, user_prompt = self.test_case_generator.prompt_builder.get_two_stage_prompts(
                business_type, 'test_point'
            )

            if system_prompt is None or user_prompt is None:
                raise RuntimeError(f"无法为 {business_type} 获取测试点生成提示词组合")

            logger.info(f"获取到测试点提示词 | 系统提示词长度: {len(system_prompt)} | 用户提示词长度: {len(user_prompt)}")

            # 应用模板变量到系统提示词和用户提示词，确保传递generation_stage='test_point'
            resolved_system_prompt = self.test_case_generator.prompt_builder._apply_template_variables(
                content=system_prompt,
                additional_context=additional_context or {},
                business_type=business_type,
                project_id=project_id,
                endpoint_params={
                    'generation_stage': 'test_point',
                    'additional_context': additional_context or {}
                }
            )

            resolved_user_prompt = self.test_case_generator.prompt_builder._apply_template_variables(
                content=user_prompt,
                additional_context=additional_context or {},
                business_type=business_type,
                project_id=project_id,
                endpoint_params={
                    'generation_stage': 'test_point',
                    'additional_context': additional_context or {}
                }
            )

            logger.info(f"模板变量解析完成 | 解析后系统提示词长度: {len(resolved_system_prompt)} | 解析后用户提示词长度: {len(resolved_user_prompt)}")

            # 记录模板变量和提示词构建过程到AI日志
            if ai_logger:
                try:
                    template_variables = {
                        "business_type": business_type,
                        "project_id": project_id,
                        "generation_stage": "test_point",
                        "additional_context": additional_context or {},
                        "endpoint_params": {
                            'generation_stage': 'test_point',
                            'additional_context': additional_context or {}
                        }
                    }
                    ai_logger.log_template_variables(template_variables)

                    # 记录提示词构建过程
                    prompt_building_process = {
                        "system_prompt_length": len(system_prompt),
                        "user_prompt_length": len(user_prompt),
                        "resolved_system_prompt_length": len(resolved_system_prompt),
                        "resolved_user_prompt_length": len(resolved_user_prompt),
                        "business_type": business_type,
                        "generation_stage": "test_point",
                        "system_prompt_was_modified": len(resolved_system_prompt) != len(system_prompt),
                        "user_prompt_was_modified": len(resolved_user_prompt) != len(user_prompt)
                    }
                    ai_logger.log_prompt_building_process(prompt_building_process)

                    # 记录替换后的提示词和模板变量替换信息
                    ai_logger.log_resolved_prompts(resolved_system_prompt, resolved_user_prompt)
                    ai_logger.log_template_replacement_info(
                        system_prompt, resolved_system_prompt,
                        user_prompt, resolved_user_prompt
                    )
                except Exception as log_error:
                    logger.warning(f"Failed to log template variables and prompt building: {log_error}")

            # 更新进度：开始AI调用
            self._update_job_progress(
                task_id=task_id,
                current_step="正在调用AI模型生成测试点...",
                progress=30
            )

            # 使用LLM生成测试点数据
            logger.info(f"开始AI生成测试点 | 业务类型: {business_type}")
            response = self.test_case_generator.llm_client.generate_test_cases(
                system_prompt,
                resolved_user_prompt,
                ai_logger=ai_logger,
                resolved_system_prompt=resolved_system_prompt,
                resolved_requirements_prompt=resolved_user_prompt
            )

            if response is None:
                raise RuntimeError("AI调用失败：无法从LLM获取响应")

            # 更新进度：开始处理AI响应
            self._update_job_progress(
                task_id=task_id,
                current_step="正在解析AI生成的测试点数据...",
                progress=60
            )

            # 使用增强的JSON处理和验证机制
            from ..utils.data_validator_repairer import DataValidatorRepairer
            from ..core.json_extractor import JSONExtractor

            # 提取和验证JSON数据
            logger.info(f"Starting JSON extraction from AI response (response length: {len(response)})")
            logger.info(f"Response type: {type(response)}")
            logger.info(f"Response preview: {response[:200]}...")

            json_data, validated_test_points = JSONExtractor.extract_and_validate_json_response(
                response, validate_and_repair=True, ai_logger=ai_logger
            )

            logger.info(f"JSON extraction completed: json_data type={type(json_data)}, test_points_count={len(validated_test_points)}")

            if not validated_test_points:
                raise RuntimeError("AI响应解析失败：未找到有效的测试点数据")

            logger.info(f"AI生成测试点成功 | 业务类型: {business_type} | 测试点数量: {len(validated_test_points)}")

            # 获取处理总结
            validator = DataValidatorRepairer()
            validation_summary = validator.get_processing_summary()
            logger.info(f"测试点数据验证完成: 成功率 {validation_summary['success_rate']:.1f}%")

            # 构建标准格式的测试点数据
            test_points_data = {
                'test_points': validated_test_points
            }

            
            # 更新进度
            self._update_job_progress(
                task_id=task_id,
                current_step="正在验证生成的测试点...",
                progress=70
            )

            if not test_points_data or not test_points_data.get('test_points'):
                raise GenerationError(
                    "未能生成有效的测试点数据",
                    details={"business_type": business_type}
                )

            # 保存到数据库（如果需要）
            saved_items = []
            if save_to_database:
                
                saved_items = self._save_test_points_to_database(
                    test_points_data['test_points'],
                    business_type,
                    project_id
                )

                
                self._update_job_progress(
                    task_id=task_id,
                    current_step="已保存测试点到数据库",
                    progress=90
                )

            # 创建生成结果
            result = GenerationResult(
                task_id=task_id,
                stage=GenerationStage.TEST_POINT,
                status=GenerationStatus.COMPLETED,
                business_type=business_type,
                project_id=project_id,
                generated_items=test_points_data['test_points'],
                summary={
                    "total_points": len(test_points_data['test_points']),
                    "saved_to_database": save_to_database,
                    "saved_items_count": len(saved_items)
                },
                metrics={
                    "generation_time": time.time() - start_time
                }
            )

            
            # 完成任务
            self._complete_generation_job(task_id, result)

            return GenerationResponse(
                success=True,
                task_id=task_id,
                message=f"成功生成 {len(test_points_data['test_points'])} 个测试点",
                stage=GenerationStage.TEST_POINT,
                status=GenerationStatus.COMPLETED,
                result=result
            )

        except Exception as e:
            # 处理错误并更新任务状态
            error_info = self._handle_generation_error(e, task_id, start_time)
            return GenerationResponse(
                success=False,
                task_id=task_id,
                message=f"测试点生成失败: {str(e)}",
                stage=GenerationStage.TEST_POINT,
                status=GenerationStatus.FAILED,
                can_retry=error_info.get('can_retry', False),
                retry_count=error_info.get('retry_count', 0),
                max_retries=error_info.get('max_retries', 3)
            )

    def generate_test_cases_from_points(
        self,
        business_type: str,
        test_points: Optional[List[Dict[str, Any]]] = None,
        test_point_ids: Optional[List[int]] = None,
        additional_context: Optional[Dict[str, Any]] = None,
        save_to_database: bool = False,
        project_id: Optional[int] = None
    ) -> GenerationResponse:
        """
        从测试点生成测试用例（第二阶段）。

        Args:
            business_type: 业务类型
            test_points: 外部提供的测试点数据
            test_point_ids: 数据库中的测试点ID列表
            additional_context: 额外上下文
            save_to_database: 是否保存到数据库
            project_id: 项目ID

        Returns:
            生成响应

        Raises:
            GenerationError: 生成失败时抛出
        """
        # 如果没有传入task_id，创建一个（保持向后兼容）
        if not task_id:
            task_id = str(uuid.uuid4())

        start_time = time.time()

        try:
            # 验证业务类型
            business_config = self.validate_business_type(business_type)

            # 确定测试点数据源
            if test_point_ids:
                # 从数据库获取测试点
                test_points_data = self._get_test_points_from_database(test_point_ids)
            elif test_points:
                # 使用外部提供的测试点数据
                test_points_data = test_points
            else:
                raise ValidationError("必须提供 test_points 或 test_point_ids 参数")

            # 注意：不再在这里创建任务记录，由API端点负责
            # 这样可以避免重复任务创建的问题

            # 生成测试用例
            test_cases_data = self.test_case_generator.generate_test_cases_from_external_points(
                business_type=business_type,
                test_points_data={
                    "test_points": test_points_data
                },
                additional_context=additional_context
            )

            # 更新进度
            self._update_job_progress(
                task_id=task_id,
                current_step="正在验证生成的测试用例...",
                progress=70
            )

            if not test_cases_data or not test_cases_data.get('test_cases'):
                raise GenerationError(
                    "未能生成有效的测试用例数据",
                    details={"business_type": business_type, "test_points_count": len(test_points_data)}
                )

            # 保存到数据库（如果需要）
            saved_items = []
            if save_to_database:
                saved_items = self._save_test_cases_to_database(
                    test_cases_data['test_cases'],
                    business_type,
                    project_id
                )
                self._update_job_progress(
                    task_id=task_id,
                    current_step="已保存测试用例到数据库",
                    progress=90
                )

            # 创建生成结果
            result = GenerationResult(
                task_id=task_id,
                stage=GenerationStage.TEST_CASE,
                status=GenerationStatus.COMPLETED,
                business_type=business_type,
                project_id=project_id,
                generated_items=test_cases_data['test_cases'],
                summary={
                    "total_cases": len(test_cases_data['test_cases']),
                    "source_points": len(test_points_data),
                    "saved_to_database": save_to_database,
                    "saved_items_count": len(saved_items)
                },
                metrics={
                    "generation_time": time.time() - start_time
                }
            )

            # 完成任务
            self._complete_generation_job(task_id, result)

            return GenerationResponse(
                success=True,
                task_id=task_id,
                message=f"成功生成 {len(test_cases_data['test_cases'])} 个测试用例",
                stage=GenerationStage.TEST_CASE,
                status=GenerationStatus.COMPLETED,
                result=result
            )

        except Exception as e:
            # 处理错误并更新任务状态
            error_info = self._handle_generation_error(e, task_id, start_time)
            return GenerationResponse(
                success=False,
                task_id=task_id,
                message=f"测试用例生成失败: {str(e)}",
                stage=GenerationStage.TEST_CASE,
                status=GenerationStatus.FAILED,
                can_retry=error_info.get('can_retry', False),
                retry_count=error_info.get('retry_count', 0),
                max_retries=error_info.get('max_retries', 3)
            )

    def get_task_status(self, task_id: str) -> TaskStatusResponse:
        """
        获取任务状态。

        Args:
            task_id: 任务ID

        Returns:
            任务状态响应

        Raises:
            GenerationError: 任务不存在时抛出
        """
        with self.db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(
                GenerationJob.id == task_id
            ).first()

            if not job:
                raise GenerationError(
                    f"任务 '{task_id}' 不存在",
                    error_code=ErrorCode.NOT_FOUND
                )

            # 构建进度信息
            progress = GenerationProgress(
                # stage field not available in GenerationJob model - using default
                stage=GenerationStage.TEST_POINT,  # Default fallback
                status=GenerationStatus(job.status),
                progress=job.progress or 0,
                current_step=job.step_description or "准备中",
                total_steps=job.total_steps or 1,
                current_step_index=job.current_step or 0
            )

            # 构建响应
            response = TaskStatusResponse(
                task_id=job.id,
                # stage field not available in GenerationJob model - using default
                stage=GenerationStage.TEST_POINT,  # Default fallback
                status=GenerationStatus(job.status),
                progress=progress,
                created_at=job.created_at.isoformat(),
                # updated_at field not available in GenerationJob model
                # updated_at=job.updated_at.isoformat()
            )

            # started_at field not available in GenerationJob model
            # if job.started_at:
            #     response.started_at = job.started_at.isoformat()
            if job.completed_at:
                response.completed_at = job.completed_at.isoformat()

            # 如果有结果数据，添加到响应中
            if job.result_data:
                try:
                    import json
                    result_data = json.loads(job.result_data)
                    response.result = GenerationResult(**result_data)
                except Exception as e:
                    logger.warning(f"解析任务结果失败: {e}")

            # 如果有错误信息，添加到响应中
            if job.error_data:
                try:
                    import json
                    error_data = json.loads(job.error_data)
                    response.error = error_data
                except Exception as e:
                    logger.warning(f"解析错误信息失败: {e}")

            return response

    def cancel_task(self, task_id: str) -> bool:
        """
        取消任务。

        Args:
            task_id: 任务ID

        Returns:
            是否成功取消
        """
        try:
            with self.db_manager.get_session() as db:
                job = db.query(GenerationJob).filter(
                    GenerationJob.id == task_id,
                    GenerationJob.status.in_([JobStatus.PENDING, JobStatus.RUNNING])
                ).first()

                if not job:
                    return False

                job.status = JobStatus.CANCELLED
                job.completed_at = datetime.utcnow()
                db.commit()

                # 从活跃任务列表中移除
                if task_id in self.active_jobs:
                    del self.active_jobs[task_id]

                return True

        except Exception as e:
            logger.error(f"取消任务失败: {e}")
            return False

    # 私有方法
    def _create_generation_job(
        self,
        task_id: str,
        stage: GenerationStage,
        business_type: str,
        project_id: Optional[int] = None
    ):
        """创建生成任务记录。"""
        with self.db_manager.get_session() as db:
            job = GenerationJob(
                id=task_id,
                project_id=project_id or 1,  # Default project if not provided
                business_type=business_type,
                status=JobStatus.PENDING,
                total_steps=6  # 默认步骤数
            )
            db.add(job)
            db.commit()

    def _update_job_progress(
        self,
        task_id: str,
        status: Optional[GenerationStatus] = None,
        current_step: Optional[str] = None,
        progress: Optional[float] = None,
        current_step_index: Optional[int] = None
    ):
        """更新任务进度。"""
        with self.db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                if status:
                    # Handle both enum and string inputs
                    if hasattr(status, 'value'):
                        job.status = JobStatus(status.value)
                    else:
                        job.status = JobStatus(status)
                    # started_at field not available in GenerationJob model
                    # if status == GenerationStatus.RUNNING and not job.started_at:
                    #     job.started_at = datetime.utcnow()

                if current_step:
                    job.step_description = current_step

                if progress is not None:
                    job.progress = progress

                if current_step_index is not None:
                    job.current_step = current_step_index

                # Note: GenerationJob model doesn't have updated_at field
                # It only has created_at and completed_at
                db.commit()

    def _complete_generation_job(self, task_id: str, result: GenerationResult):
        """完成生成任务。"""
        with self.db_manager.get_session() as db:
            job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
            if job:
                job.status = JobStatus.COMPLETED
                job.progress = 100.0
                job.completed_at = datetime.utcnow()

                # 保存结果数据
                import json
                job.result_data = json.dumps(result.dict(), ensure_ascii=False)  # 移除indent以节省存储空间

                db.commit()

    def _handle_generation_error(
        self,
        error: Exception,
        task_id: str,
        start_time: float
    ) -> Dict[str, Any]:
        """处理生成错误。"""
        try:
            # 转换为GenerationError
            if not isinstance(error, GenerationError):
                error = GenerationError(
                    f"生成过程中发生错误: {str(error)}",
                    details={"original_error": str(error), "type": type(error).__name__}
                )

            # 更新任务状态
            with self.db_manager.get_session() as db:
                job = db.query(GenerationJob).filter(GenerationJob.id == task_id).first()
                if job:
                    job.status = JobStatus.FAILED
                    job.completed_at = datetime.utcnow()

                    # 保存错误信息
                    import json
                    job.error_data = json.dumps({
                        "error_code": error.error_code.value,
                        "message": error.message,
                        "details": error.details,
                        "recoverable": error.recoverable,
                        "retry_count": error.retry_count
                    }, ensure_ascii=False)  # 移除indent以节省存储空间

                    db.commit()

            return {
                "can_retry": error.can_retry(),
                "retry_count": error.retry_count,
                "max_retries": error.max_retries,
                "error_code": error.error_code.value
            }

        except Exception as e:
            logger.error(f"处理生成错误时发生异常: {e}")
            return {"can_retry": True, "retry_count": 0, "max_retries": 3}

    def _get_test_points_from_database(self, test_point_ids: List[int]) -> List[Dict[str, Any]]:
        """从数据库获取测试点数据（从统一表）。"""
        with self.db_manager.get_session() as db:
            # 从统一表中查询测试点阶段的数据
            test_points = db.query(UnifiedTestCase).filter(
                UnifiedTestCase.test_point_id.in_(test_point_ids),
                UnifiedTestCase.stage == UnifiedTestCaseStage.TEST_POINT
            ).all()

            if len(test_points) != len(test_point_ids):
                found_ids = [tp.id for tp in test_points]
                missing_ids = set(test_point_ids) - set(found_ids)
                raise GenerationError(
                    f"测试点不存在: {list(missing_ids)}",
                    details={"found_ids": found_ids, "missing_ids": list(missing_ids)}
                )

            return [
                {
                    "id": tp.id,
                    "test_point_id": tp.test_point_id,
                    "title": tp.name,  # 使用name字段
                    "description": tp.description,
                    "priority": tp.priority,
                    "business_type": tp.business_type,
                    "status": tp.status.value,
                    "preconditions": tp.preconditions or [],
                }
                for tp in test_points
            ]

    def _save_test_points_to_database(
        self,
        test_points: List[Dict[str, Any]],
        business_type: str,
        project_id: Optional[int]
    ) -> List[int]:
        """保存测试点到统一数据库表。"""
        saved_ids = []
        with self.db_manager.get_session() as db:
            for tp_data in test_points:
                test_point = UnifiedTestCase(
                    project_id=project_id,
                    business_type=business_type,
                    test_case_id=tp_data.get('test_point_id'),
                    name=tp_data.get('title'),  # 使用name字段
                    description=tp_data.get('description'),
                    priority=tp_data.get('priority', 'medium'),
                    stage=UnifiedTestCaseStage.TEST_POINT,
                    status=UnifiedTestCaseStatus.DRAFT,
                    # 测试点阶段没有执行详情
                    preconditions=None,
                    steps=None,
                    expected_result=None
                )
                db.add(test_point)
                db.flush()  # 获取生成的ID
                saved_ids.append(test_point.id)

            db.commit()

        return saved_ids

    def _save_test_cases_to_database(
        self,
        test_cases: List[Dict[str, Any]],
        business_type: str,
        project_id: Optional[int]
    ) -> List[int]:
        """保存测试用例到数据库。"""
        saved_ids = []
        with self.db_manager.get_session() as db:
            for tc_data in test_cases:
                test_case = UnifiedTestCase(
                    project_id=project_id,
                    business_type=business_type,
                    test_point_id=tc_data.get('test_point_id'),
                    test_case_id=tc_data.get('test_case_id'),
                    name=tc_data.get('name'),
                    description=tc_data.get('description'),
                    priority=tc_data.get('priority', 'medium'),
                    module=tc_data.get('module'),
                    functional_module=tc_data.get('functional_module'),
                    functional_domain=tc_data.get('functional_domain'),
                    preconditions=tc_data.get('preconditions'),
                    steps=tc_data.get('steps'),
                    expected_result=tc_data.get('expected_result'),
                    remarks=tc_data.get('remarks'),
                    generation_job_id=tc_data.get('generation_job_id')
                )
                db.add(test_case)
                db.flush()  # 获取生成的ID
                saved_ids.append(test_case.id)

            db.commit()

        return saved_ids