"""
统一的生成服务测试。

测试两阶段测试用例生成流程的核心功能，包括：
- 测试点生成
- 测试用例生成
- 任务管理
- 错误处理
- 配置管理
"""

import pytest
import asyncio
import uuid
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from typing import Dict, Any

from src.services.generation_service import UnifiedGenerationService
from src.database.models import BusinessType, TestPointStatus, GenerationJob, JobStatus
from src.models.generation import GenerationStage, GenerationStatus, TaskStatusResponse
from src.utils.config import Config
from src.exceptions.generation import GenerationError, BusinessTypeError, ValidationError
from tests.utils import TestDataManager


class TestUnifiedGenerationService:
    """统一的生成服务测试类。"""

    def setup_method(self):
        """测试前设置。"""
        # Mock database session for TestDataManager
        mock_session = Mock()
        self.test_data = TestDataManager(mock_session)
        self.config = Config()

        # Create service with mocked dependencies
        with patch('src.services.generation_service.DatabaseManager') as mock_db_manager:
            with patch('src.services.generation_service.TestPointGenerator') as mock_tp_gen:
                with patch('src.services.generation_service.TestCaseGenerator') as mock_tc_gen:
                    mock_db_manager.return_value = Mock()
                    mock_tp_gen.return_value = Mock()
                    mock_tc_gen.return_value = Mock()

                    self.service = UnifiedGenerationService(self.config)
                    self.mock_db = mock_db_manager.return_value
                    self.mock_test_point_generator = mock_tp_gen.return_value
                    self.mock_test_case_generator = mock_tc_gen.return_value

                    # Clear active jobs
                    self.service.active_jobs = {}

    def teardown_method(self):
        """测试后清理。"""
        self.service.active_jobs.clear()

    def test_init_with_default_config(self):
        """测试使用默认配置初始化。"""
        service = UnifiedGenerationService()
        assert service.config is not None
        assert service.db_manager is not None
        assert service.test_point_generator is not None
        assert service.test_case_generator is not None
        assert service.active_jobs == {}

    def test_init_with_custom_config(self):
        """测试使用自定义配置初始化。"""
        custom_config = Config()
        custom_config.set('test_mode', True)

        service = UnifiedGenerationService(custom_config)
        assert service.config == custom_config

    @pytest.mark.asyncio
    async def test_generate_test_points_success(self):
        """测试成功生成测试点。"""
        # 准备测试数据
        project_id = 1
        business_type = BusinessType.RCC
        count = 10
        additional_context = "Additional context for testing"

        # Mock database responses
        mock_project = self.test_data.create_project(project_id, "Test Project")
        self.mock_db.get_project.return_value = mock_project

        mock_business_config = self.test_data.create_business_type_config(
            business_type.value, test_point_combination_id=1, test_case_combination_id=2
        )
        self.mock_db.get_business_type_config.return_value = mock_business_config

        # Mock generator response
        expected_test_points = [
            {"id": 1, "title": "Test Point 1", "description": "Description 1"},
            {"id": 2, "title": "Test Point 2", "description": "Description 2"}
        ]
        self.mock_test_point_generator.generate_test_points.return_value = expected_test_points

        # Mock database save
        self.mock_db.save_test_points.return_value = expected_test_points

        # 执行测试
        result = await self.service.generate_test_points(
            project_id=project_id,
            business_type=business_type,
            count=count,
            additional_context=additional_context
        )

        # 验证结果
        assert result["success"] is True
        assert len(result["test_points"]) == len(expected_test_points)
        assert result["business_type"] == business_type.value
        assert result["project_id"] == project_id

        # 验证调用
        self.mock_db.get_project.assert_called_once_with(project_id)
        self.mock_db.get_business_type_config.assert_called_once_with(business_type)
        self.mock_test_point_generator.generate_test_points.assert_called_once()
        self.mock_db.save_test_points.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_test_points_invalid_project(self):
        """测试生成测试点时项目不存在。"""
        project_id = 999
        business_type = BusinessType.RCC

        # Mock project not found
        self.mock_db.get_project.return_value = None

        # 执行测试并验证异常
        with pytest.raises(ValidationError, match="Project not found"):
            await self.service.generate_test_points(
                project_id=project_id,
                business_type=business_type,
                count=10
            )

    @pytest.mark.asyncio
    async def test_generate_test_points_invalid_business_type(self):
        """测试生成测试点时业务类型不存在。"""
        project_id = 1
        business_type = BusinessType.RCC

        # Mock project exists
        mock_project = self.test_data.create_project(project_id, "Test Project")
        self.mock_db.get_project.return_value = mock_project

        # Mock business type config not found
        self.mock_db.get_business_type_config.return_value = None

        # 执行测试并验证异常
        with pytest.raises(BusinessTypeError, match="Business type configuration not found"):
            await self.service.generate_test_points(
                project_id=project_id,
                business_type=business_type,
                count=10
            )

    @pytest.mark.asyncio
    async def test_generate_test_cases_from_points_success(self):
        """测试从测试点成功生成测试用例。"""
        project_id = 1
        business_type = BusinessType.RCC
        test_point_ids = [1, 2, 3]
        complexity_level = "standard"
        include_negative_cases = True
        additional_context = "Additional context"

        # Mock database responses
        mock_project = self.test_data.create_project(project_id, "Test Project")
        mock_business_config = self.test_data.create_business_type_config(
            business_type.value, test_case_combination_id=1
        )

        self.mock_db.get_project.return_value = mock_project
        self.mock_db.get_business_type_config.return_value = mock_business_config

        # Mock test points
        mock_test_points = [
            {"id": 1, "title": "Test Point 1"},
            {"id": 2, "title": "Test Point 2"},
            {"id": 3, "title": "Test Point 3"}
        ]
        self.mock_db.get_test_points_by_ids.return_value = mock_test_points

        # Mock generator response
        expected_test_cases = [
            {"id": 1, "title": "Test Case 1", "test_point_id": 1},
            {"id": 2, "title": "Test Case 2", "test_point_id": 2}
        ]
        self.mock_test_case_generator.generate_test_cases.return_value = expected_test_cases

        # Mock database save
        self.mock_db.save_test_cases.return_value = expected_test_cases

        # 执行测试
        result = await self.service.generate_test_cases_from_points(
            project_id=project_id,
            business_type=business_type,
            test_point_ids=test_point_ids,
            complexity_level=complexity_level,
            include_negative_cases=include_negative_cases,
            additional_context=additional_context
        )

        # 验证结果
        assert result["success"] is True
        assert len(result["test_cases"]) == len(expected_test_cases)
        assert result["business_type"] == business_type.value
        assert result["project_id"] == project_id

        # 验证调用
        self.mock_db.get_test_points_by_ids.assert_called_once_with(test_point_ids)
        self.mock_test_case_generator.generate_test_cases.assert_called_once()
        self.mock_db.save_test_cases.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_full_two_stage_success(self):
        """测试完整的两阶段生成成功。"""
        project_id = 1
        business_type = BusinessType.RCC
        test_point_count = 10
        test_case_complexity = "comprehensive"
        additional_context = "Full two-stage generation"

        # Mock database responses
        mock_project = self.test_data.create_project(project_id, "Test Project")
        mock_business_config = self.test_data.create_business_type_config(
            business_type.value,
            test_point_combination_id=1,
            test_case_combination_id=2
        )

        self.mock_db.get_project.return_value = mock_project
        self.mock_db.get_business_type_config.return_value = mock_business_config

        # Mock test point generation
        expected_test_points = [
            {"id": 1, "title": "Test Point 1"},
            {"id": 2, "title": "Test Point 2"}
        ]
        self.mock_test_point_generator.generate_test_points.return_value = expected_test_points
        self.mock_db.save_test_points.return_value = expected_test_points

        # Mock test case generation
        expected_test_cases = [
            {"id": 1, "title": "Test Case 1", "test_point_id": 1},
            {"id": 2, "title": "Test Case 2", "test_point_id": 2}
        ]
        self.mock_test_case_generator.generate_test_cases.return_value = expected_test_cases
        self.mock_db.save_test_cases.return_value = expected_test_cases

        # 执行测试
        result = await self.service.generate_full_two_stage(
            project_id=project_id,
            business_type=business_type,
            test_point_count=test_point_count,
            test_case_complexity=test_case_complexity,
            additional_context=additional_context
        )

        # 验证结果
        assert result["success"] is True
        assert result["stage"] == GenerationStage.COMPLETED.value
        assert "test_points" in result
        assert "test_cases" in result
        assert len(result["test_points"]) > 0
        assert len(result["test_cases"]) > 0

        # 验证两个阶段都被调用
        self.mock_test_point_generator.generate_test_points.assert_called_once()
        self.mock_test_case_generator.generate_test_cases.assert_called_once()

    def test_create_generation_job(self):
        """测试创建生成任务。"""
        project_id = 1
        business_type = BusinessType.RCC
        stage = GenerationStage.TEST_POINT_GENERATION

        job_id = self.service.create_generation_job(
            project_id=project_id,
            business_type=business_type,
            stage=stage
        )

        # 验证任务ID格式
        assert isinstance(job_id, str)
        assert len(job_id) == 36  # UUID length

        # 验证任务被添加到活跃任务列表
        assert job_id in self.service.active_jobs
        job_info = self.service.active_jobs[job_id]
        assert job_info["project_id"] == project_id
        assert job_info["business_type"] == business_type
        assert job_info["stage"] == stage.value

    def test_get_job_status(self):
        """测试获取任务状态。"""
        # 创建任务
        job_id = self.service.create_generation_job(
            project_id=1,
            business_type=BusinessType.RCC,
            stage=GenerationStage.TEST_POINT_GENERATION
        )

        # 获取状态
        status = self.service.get_job_status(job_id)

        # 验证状态
        assert status["success"] is True
        assert status["task_id"] == job_id
        assert status["status"] == JobStatus.PENDING.value
        assert status["progress"] == 0
        assert "created_at" in status

    def test_get_job_status_not_found(self):
        """测试获取不存在的任务状态。"""
        job_id = str(uuid.uuid4())

        status = self.service.get_job_status(job_id)

        assert status["success"] is False
        assert "error" in status

    def test_update_job_progress(self):
        """测试更新任务进度。"""
        # 创建任务
        job_id = self.service.create_generation_job(
            project_id=1,
            business_type=BusinessType.RCC,
            stage=GenerationStage.TEST_POINT_GENERATION
        )

        # 更新进度
        self.service.update_job_progress(job_id, progress=50, message="Generating test points")

        # 验证更新
        job_info = self.service.active_jobs[job_id]
        assert job_info["progress"] == 50
        assert job_info["step_description"] == "Generating test points"

    def test_complete_job_success(self):
        """测试成功完成任务。"""
        # 创建任务
        job_id = self.service.create_generation_job(
            project_id=1,
            business_type=BusinessType.RCC,
            stage=GenerationStage.TEST_POINT_GENERATION
        )

        # 完成任务
        test_results = {"test_points": [{"id": 1, "title": "Test Point 1"}]}
        self.service.complete_job(job_id, success=True, results=test_results)

        # 验证任务完成状态
        job_info = self.service.active_jobs[job_id]
        assert job_info["status"] == JobStatus.COMPLETED.value
        assert job_info["progress"] == 100
        assert job_info["results"] == test_results

    def test_complete_job_failure(self):
        """测试任务失败。"""
        # 创建任务
        job_id = self.service.create_generation_job(
            project_id=1,
            business_type=BusinessType.RCC,
            stage=GenerationStage.TEST_POINT_GENERATION
        )

        # 任务失败
        error_message = "Generation failed due to LLM error"
        self.service.complete_job(job_id, success=False, error_message=error_message)

        # 验证任务失败状态
        job_info = self.service.active_jobs[job_id]
        assert job_info["status"] == JobStatus.FAILED.value
        assert job_info["error_message"] == error_message

    @pytest.mark.asyncio
    async def test_cleanup_old_jobs(self):
        """测试清理旧任务。"""
        # 创建几个任务
        job_ids = []
        for i in range(3):
            job_id = self.service.create_generation_job(
                project_id=1,
                business_type=BusinessType.RCC,
                stage=GenerationStage.TEST_POINT_GENERATION
            )
            job_ids.append(job_id)

        # 完成一个任务，让一个失败，保持一个pending
        self.service.complete_job(job_ids[0], success=True, results={"test_points": []})
        self.service.complete_job(job_ids[1], success=False, error_message="Test error")
        # job_ids[2] remains pending

        # Mock current time
        current_time = datetime.now()

        # Mock database cleanup
        self.mock_db.cleanup_old_jobs.return_value = 2

        # 执行清理（清理超过24小时的任务）
        cleaned_count = await self.service.cleanup_old_jobs(max_age_hours=24)

        # 验证清理结果
        assert cleaned_count == 2
        self.mock_db.cleanup_old_jobs.assert_called_once()

    def test_handle_generation_error_llm_error(self):
        """测试处理LLM错误。"""
        error = LLMError("LLM API call failed", "API Error")

        with pytest.raises(GenerationError, match="LLM service error"):
            self.service.handle_generation_error(error)

    def test_handle_generation_error_validation_error(self):
        """测试处理验证错误。"""
        error = ValidationError("Invalid input data")

        with pytest.raises(GenerationError, match="Validation error"):
            self.service.handle_generation_error(error)

    def test_handle_generation_error_generation_error(self):
        """测试处理生成错误（直接抛出）。"""
        error = GenerationError("Custom generation error")

        with pytest.raises(GenerationError, match="Custom generation error"):
            self.service.handle_generation_error(error)

    def test_validate_generation_parameters_valid(self):
        """测试验证有效的生成参数。"""
        # 有效参数
        params = {
            "project_id": 1,
            "business_type": BusinessType.RCC,
            "count": 10
        }

        # 应该不抛出异常
        self.service.validate_generation_parameters(params)

    def test_validate_generation_parameters_invalid(self):
        """测试验证无效的生成参数。"""
        # 无效参数 - 缺少必需字段
        params = {
            "business_type": BusinessType.RCC
            # 缺少 project_id
        }

        with pytest.raises(ValidationError, match="Missing required parameters"):
            self.service.validate_generation_parameters(params)

    def test_get_service_statistics(self):
        """测试获取服务统计信息。"""
        # 添加一些活跃任务
        for i in range(5):
            self.service.create_generation_job(
                project_id=1,
                business_type=BusinessType.RCC,
                stage=GenerationStage.TEST_POINT_GENERATION
            )

        # 获取统计信息
        stats = self.service.get_service_statistics()

        # 验证统计信息
        assert "active_jobs" in stats
        assert stats["active_jobs"] == 5
        assert "total_jobs_created" in stats
        assert stats["total_jobs_created"] >= 5

    @pytest.mark.asyncio
    async def test_cancel_job(self):
        """测试取消任务。"""
        # 创建任务
        job_id = self.service.create_generation_job(
            project_id=1,
            business_type=BusinessType.RCC,
            stage=GenerationStage.TEST_POINT_GENERATION
        )

        # 取消任务
        result = await self.service.cancel_job(job_id)

        # 验证取消结果
        assert result["success"] is True
        assert result["task_id"] == job_id

        # 验证任务状态
        job_info = self.service.active_jobs[job_id]
        assert job_info["status"] == JobStatus.CANCELLED.value

    @pytest.mark.asyncio
    async def test_cancel_job_not_found(self):
        """测试取消不存在的任务。"""
        job_id = str(uuid.uuid4())

        result = await self.service.cancel_job(job_id)

        assert result["success"] is False
        assert "error" in result

    def test_generate_task_id(self):
        """测试生成任务ID。"""
        task_id = self.service._generate_task_id()

        # 验证任务ID格式
        assert isinstance(task_id, str)
        assert len(task_id) == 36

        # 验证UUID格式
        # 应该能够被解析为UUID
        uuid.UUID(task_id)

    def test_build_websocket_url(self):
        """测试构建WebSocket URL。"""
        task_id = str(uuid.uuid4())

        # 需要mock window.location来测试这个方法
        with patch('src.services.generation_service.window') as mock_window:
            mock_window.location.host = "localhost:8000"
            mock_window.location.protocol = "http"

            url = self.service._build_websocket_url(task_id)

            # 验证URL格式
            assert url.startswith("ws://localhost:8000/ws/tasks/")
            assert task_id in url


class TestUnifiedGenerationServiceIntegration:
    """生成服务集成测试。"""

    def setup_method(self):
        """测试前设置。"""
        # Mock database session for TestDataManager
        mock_session = Mock()
        self.test_data = TestDataManager(mock_session)

        # Create service with mocked dependencies
        with patch('src.services.generation_service.DatabaseManager'):
            with patch('src.services.generation_service.TestPointGenerator'):
                with patch('src.services.generation_service.TestCaseGenerator'):
                    self.service = UnifiedGenerationService()

    @pytest.mark.asyncio
    async def test_end_to_end_generation_workflow(self):
        """测试端到端生成工作流。"""
        # 创建测试数据
        project = self.test_data.create_project(1, "Integration Test Project")

        # 由于这是集成测试，我们只测试主要的流程控制逻辑
        # 实际的数据库操作会在实际的集成测试中测试

        # 测试工作流逻辑
        job_id = self.service.create_generation_job(
            project_id=project.id,
            business_type=BusinessType.RCC,
            stage=GenerationStage.TEST_POINT_GENERATION
        )

        # 验证任务创建
        assert job_id is not None
        assert job_id in self.service.active_jobs

        # 模拟进度更新
        self.service.update_job_progress(job_id, 25, "Starting generation")
        self.service.update_job_progress(job_id, 50, "Processing test points")
        self.service.update_job_progress(job_id, 75, "Finalizing results")

        # 模拟任务完成
        test_results = {"test_points": [{"id": 1, "title": "Test Point 1"}]}
        self.service.complete_job(job_id, success=True, results=test_results)

        # 验证最终状态
        final_status = self.service.get_job_status(job_id)
        assert final_status["success"] is True
        assert final_status["progress"] == 100


if __name__ == "__main__":
    pytest.main([__file__])