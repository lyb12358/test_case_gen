# -*- coding: utf-8 -*-
"""
测试工具模块 - 提供测试辅助函数和类
"""

import json
import asyncio
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock
from sqlalchemy.orm import Session

# 添加导入错误处理
try:
    from src.database.models import (
        Project, BusinessTypeConfig, UnifiedTestCase,
        GenerationJob, UnifiedTestCaseStatus
    )
    MODEL_IMPORTS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Cannot import models: {e}")
    MODEL_IMPORTS_AVAILABLE = False

    # 创建mock类用于测试
    class Project:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class BusinessTypeConfig:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class UnifiedTestCase:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class GenerationJob:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    # 创建枚举mock
    class UnifiedTestCaseStatus:
        DRAFT = "draft"
        APPROVED = "approved"
        COMPLETED = "completed"

    class BusinessType:
        RCC = "RCC"
        RFD = "RFD"
        ZAB = "ZAB"
        ZBA = "ZBA"
        PAB = "PAB"
        PAE = "PAE"
        PAI = "PAI"
        RCE = "RCE"
        RES = "RES"
        RHL = "RHL"


class _TestDataManager:
    """测试数据管理器"""

    def __init__(self, db_session: Session):
        self.db_session = db_session
        self.model_imports_available = MODEL_IMPORTS_AVAILABLE

    def create_test_project(self, **kwargs) -> Project:
        """创建测试项目"""
        project_data = {
            "name": "测试项目",
            "description": "用于测试的项目",
            "is_active": True,
            **kwargs
        }

        if self.model_imports_available:
            project = Project(**project_data)
            self.db_session.add(project)
            self.db_session.commit()
        else:
            # 创建mock对象
            project = Project(**project_data)
            # 模拟数据库保存
            if not hasattr(project, 'id'):
                project.id = 1  # 模拟ID
        return project

    def create_test_business_type(self, project_id: int, **kwargs) -> BusinessTypeConfig:
        """创建测试业务类型"""
        business_type_data = {
            "code": "RCC",
            "name": "远程空调控制",
            "description": "远程控制车辆空调系统",
            "project_id": project_id,
            "is_active": True,
            **kwargs
        }
        business_type = BusinessTypeConfig(**business_type_data)
        self.db_session.add(business_type)
        self.db_session.commit()
        return business_type

    def create_test_test_point(self, project_id: int, business_type: str, **kwargs) -> UnifiedTestCase:
        """创建测试测试点 (使用UnifiedTestCase表中的stage='test_point')"""
        test_point_data = {
            "name": "开启空调测试",
            "description": "测试远程开启空调功能",
            "business_type": business_type,
            "project_id": project_id,
            "status": UnifiedTestCaseStatus.DRAFT,
            "priority": "high",
            "stage": "test_point",
            **kwargs
        }
        test_point = UnifiedTestCase(**test_point_data)
        self.db_session.add(test_point)
        self.db_session.commit()
        return test_point

    def create_test_unified_test_case(self, project_id: int, **kwargs) -> UnifiedTestCase:
        """创建测试统一测试用例"""
        test_case_data = {
            "name": "远程开启空调测试用例",
            "description": "用户通过APP远程开启空调的测试用例",
            "business_type": "RCC",
            "project_id": project_id,
            "status": UnifiedTestCaseStatus.DRAFT,
            "priority": "high",
            **kwargs
        }
        test_case = UnifiedTestCase(**test_case_data)
        self.db_session.add(test_case)
        self.db_session.commit()
        return test_case


class MockAPIClient:
    """模拟API客户端"""

    def __init__(self):
        self.requests = []
        self.responses = {}
        self.setup_default_responses()

    def setup_default_responses(self):
        """设置默认响应"""
        self.responses = {
            "GET /api/v1/config/business-types": {
                "success": True,
                "data": [
                    {
                        "id": 1,
                        "code": "RCC",
                        "name": "远程空调控制",
                        "is_active": True
                    }
                ]
            },
            "POST /api/v1/generation/test-points": {
                "success": True,
                "task_id": "test-task-123",
                "message": "生成任务已创建"
            },
            "POST /api/v1/generation/test-cases": {
                "success": True,
                "task_id": "test-task-456",
                "message": "生成任务已创建"
            },
            "GET /api/v1/generation/status/test-task-123": {
                "task_id": "test-task-123",
                "status": "completed",
                "progress": 100
            }
        }

    def get(self, url: str, **kwargs) -> Mock:
        """模拟GET请求"""
        self.requests.append(("GET", url, kwargs))
        response = Mock()
        response_data = self.responses.get(f"GET {url}", {"success": True})
        response.json.return_value = response_data
        response.status_code = 200
        return response

    def post(self, url: str, **kwargs) -> Mock:
        """模拟POST请求"""
        self.requests.append(("POST", url, kwargs))
        response = Mock()
        response_data = self.responses.get(f"POST {url}", {"success": True})
        response.json.return_value = response_data
        response.status_code = 200
        return response

    def put(self, url: str, **kwargs) -> Mock:
        """模拟PUT请求"""
        self.requests.append(("PUT", url, kwargs))
        response = Mock()
        response.json.return_value = {"success": True}
        response.status_code = 200
        return response

    def delete(self, url: str, **kwargs) -> Mock:
        """模拟DELETE请求"""
        self.requests.append(("DELETE", url, kwargs))
        response = Mock()
        response.json.return_value = {"success": True}
        response.status_code = 200
        return response


def create_mock_llm_response(content: str) -> Mock:
    """创建模拟LLM响应"""
    response = Mock()
    response.choices = [
        Mock(message=Mock(content=content))
    ]
    return response


def create_async_mock_generator(items: List[Any]):
    """创建异步模拟生成器"""
    async def async_generator():
        for item in items:
            yield item
    return async_generator()


def assert_valid_json_response(response_data: Dict[str, Any]):
    """验证JSON响应格式"""
    assert isinstance(response_data, dict)
    assert "success" in response_data

    if response_data["success"]:
        assert "data" in response_data or "message" in response_data
    else:
        assert "error" in response_data


def assert_business_type_data_valid(data: Dict[str, Any]):
    """验证业务类型数据格式"""
    required_fields = ["id", "code", "name", "description", "is_active"]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"

    assert isinstance(data["id"], int)
    assert isinstance(data["code"], str)
    assert isinstance(data["name"], str)
    assert isinstance(data["is_active"], bool)


def assert_test_case_data_valid(data: Dict[str, Any]):
    """验证测试用例数据格式"""
    required_fields = ["id", "name", "description", "business_type", "status"]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"

    assert isinstance(data["id"], int)
    assert isinstance(data["name"], str)
    assert isinstance(data["description"], str)
    assert isinstance(data["business_type"], str)


def async_test(func):
    """异步测试装饰器"""
    def wrapper(*args, **kwargs):
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(func(*args, **kwargs))
    return wrapper


class MockWebSocket:
    """模拟WebSocket连接"""

    def __init__(self):
        self.messages = []
        self.closed = False

    async def accept(self):
        """接受连接"""
        pass

    async def send_text(self, message: str):
        """发送文本消息"""
        self.messages.append(message)

    async def receive_text(self) -> str:
        """接收文本消息"""
        return "test message"

    async def close(self):
        """关闭连接"""
        self.closed = True


def create_test_user():
    """创建测试用户数据"""
    return {
        "id": 1,
        "username": "test_user",
        "email": "test@example.com",
        "is_active": True
    }


def create_test_generation_job():
    """创建测试生成任务数据"""
    return {
        "id": "test-job-123",
        "business_type": "RCC",
        "project_id": 1,
        "status": "running",
        "progress": 50,
        "message": "正在生成测试用例"
    }


# 向后兼容的别名 - 避免pytest收集警告
TestDataManager = _TestDataManager