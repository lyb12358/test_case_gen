# -*- coding: utf-8 -*-
"""
基础后端测试 - 验证测试配置是否正常工作
"""

import pytest
from unittest.mock import Mock

from src.database.models import Project, BusinessTypeConfig
from src.services.generation_service import UnifiedGenerationService
from tests.utils import TestDataManager, assert_valid_json_response


class TestBasicConfiguration:
    """基础配置测试"""

    def test_pytest_configuration(self):
        """测试pytest配置"""
        assert True  # 基础断言

    def test_imports(self):
        """测试模块导入"""
        from src.utils.config import Config
        from src.database.database import DatabaseManager
        assert Config is not None
        assert DatabaseManager is not None

    def test_database_models_creation(self):
        """测试数据库模型创建"""
        # 测试Project模型
        project_data = {
            "name": "测试项目",
            "description": "测试描述",
            "is_active": True
        }
        project = Project(**project_data)
        assert project.name == "测试项目"
        assert project.is_active is True

        # 测试BusinessTypeConfig模型
        business_type_data = {
            "code": "RCC",
            "name": "远程空调控制",
            "description": "测试业务类型",
            "project_id": 1,
            "is_active": True
        }
        business_type = BusinessTypeConfig(**business_type_data)
        assert business_type.code == "RCC"
        assert business_type.is_active is True

    def test_mock_service_creation(self, mock_generation_service):
        """测试模拟服务创建"""
        assert mock_generation_service is not None
        assert hasattr(mock_generation_service, 'generate_test_points')
        assert hasattr(mock_generation_service, 'generate_test_cases_from_points')

    def test_sample_data_fixtures(self, sample_business_type_data, sample_project_data):
        """测试示例数据fixtures"""
        assert sample_business_type_data["code"] == "RCC"
        assert sample_project_data["name"] == "测试项目"

    def test_response_validation_utility(self):
        """测试响应验证工具函数"""
        valid_response = {
            "success": True,
            "data": {"id": 1, "name": "test"}
        }
        assert_valid_json_response(valid_response)

        invalid_response = {
            "data": {"id": 1, "name": "test"}
        }
        with pytest.raises(AssertionError):
            assert_valid_json_response(invalid_response)

    def test_test_data_manager(self, test_db_session):
        """测试数据管理器"""
        data_manager = TestDataManager(test_db_session)

        # 创建测试项目
        project = data_manager.create_test_project(name="测试项目")
        assert project.id is not None
        assert project.name == "测试项目"

        # 创建测试业务类型
        business_type = data_manager.create_test_business_type(
            project_id=project.id,
            code="RFD"
        )
        assert business_type.id is not None
        assert business_type.code == "RFD"
        assert business_type.project_id == project.id

    def test_mock_api_client(self):
        """测试模拟API客户端"""
        from tests.utils import MockAPIClient

        client = MockAPIClient()

        # 测试GET请求
        response = client.get("/api/v1/test")
        assert response.status_code == 200
        assert response.json.return_value["success"] is True

        # 测试POST请求
        response = client.post("/api/v1/test", json={"data": "test"})
        assert response.status_code == 200
        assert len(client.requests) == 2

    def test_async_test_decorator(self):
        """测试异步测试装饰器"""
        from tests.utils import async_test

        @async_test
        async def async_function():
            return "async_result"

        result = async_function()
        assert result == "async_result"


@pytest.mark.unit
class TestServiceBasics:
    """服务基础测试"""

    def test_unified_generation_service_import(self):
        """测试统一生成服务导入"""
        service = UnifiedGenerationService()
        assert service is not None

    def test_unified_generation_service_methods(self):
        """测试统一生成服务方法存在"""
        service = UnifiedGenerationService()

        # 检查方法是否存在
        assert hasattr(service, 'generate_test_points')
        assert hasattr(service, 'generate_test_cases_from_points')
        assert hasattr(service, 'get_task_status')
        assert hasattr(service, 'cancel_task')

        # 检查方法是否可调用
        assert callable(service.generate_test_points)
        assert callable(service.generate_test_cases_from_points)
        assert callable(service.get_task_status)
        assert callable(service.cancel_task)


@pytest.mark.slow
class TestPerformanceBasics:
    """性能基础测试"""

    def test_basic_performance(self):
        """基础性能测试"""
        import time

        start_time = time.time()

        # 执行一些简单操作
        result = sum(range(1000))

        end_time = time.time()
        execution_time = end_time - start_time

        assert result == 499500  # 验证计算结果
        assert execution_time < 0.1  # 确保执行时间在合理范围内


if __name__ == "__main__":
    # 运行基础测试
    pytest.main([__file__, "-v"])