# -*- coding: utf-8 -*-
"""
pytest配置文件 - 提供全局fixtures和测试配置
"""

import pytest
import asyncio
import sys
import os
from typing import Generator, AsyncGenerator
from unittest.mock import Mock, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# 添加src目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

# 简化导入策略，创建测试专用的配置管理器
class TestConfigManager:
    """测试配置管理器"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._config = self._create_config()
            self._db_manager = self._create_db_manager()
            self._initialized = True

    def _create_config(self):
        """创建配置实例"""
        try:
            from src.utils.config import Config
            return Config()
        except ImportError:
            # 测试配置
            class TestConfig:
                def __init__(self, **kwargs):
                    self.user = kwargs.get('user', 'test_user')
                    self.password = kwargs.get('password', 'test_password')
                    self.database = kwargs.get('database', 'test_case_gen_test')
                    self.host = kwargs.get('host', 'localhost')
                    self.port = kwargs.get('port', 3306)
                    self.api_key = kwargs.get('api_key', 'test_api_key')
                    self.api_base_url = kwargs.get('api_base_url', 'https://api.openai.com/v1')
                    self.model = kwargs.get('model', 'gpt-4')
                    # 为数据库管理器添加必要属性
                    self.database_url = f"mysql+pymysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
            return TestConfig()

    def _create_db_manager(self):
        """创建数据库管理器"""
        try:
            from src.database.database import DatabaseManager
            return DatabaseManager(self._config)
        except ImportError:
            # 测试数据库管理器
            class TestDatabaseManager:
                def __init__(self, config=None):
                    self.config = config or self._config
            return TestDatabaseManager(self._config)

    @property
    def config(self):
        return self._config

    @property
    def db_manager(self):
        return self._db_manager

# 全局配置实例
test_config_manager = TestConfigManager()
Config = test_config_manager.config
DatabaseManager = test_config_manager.db_manager

# 简化模型导入
try:
    from src.database.models import Base
    MODEL_IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Warning: Cannot import Base model: {e}")
    MODEL_IMPORT_SUCCESS = False

    # 创建Base mock用于测试
    class Base:
        metadata = Mock()
        metadata.create_all = Mock()


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环用于异步测试"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_config():
    """测试配置fixture"""
    return Config(
        user="test_user",
        password="test_password",
        database="test_case_gen_test",
        host="localhost",
        port=3306,
        api_key="test_api_key",
        api_base_url="https://api.openai.com/v1",
        model="gpt-4"
    )


@pytest.fixture(scope="session")
def test_db_engine():
    """创建测试数据库引擎（内存SQLite）"""
    engine = create_engine(
        "sqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={
            "check_same_thread": False,
        },
    )

    # 只有在模型导入成功时才创建表
    if MODEL_IMPORT_SUCCESS:
        Base.metadata.create_all(bind=engine)
        yield engine
        Base.metadata.drop_all(bind=engine)
    else:
        yield engine  # 返回空引擎用于测试


@pytest.fixture
def test_db_session(test_db_engine) -> Generator[Session, None, None]:
    """创建测试数据库会话"""
    TestSession = sessionmaker(bind=test_db_engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def mock_generation_service():
    """模拟生成服务"""
    try:
        from src.services.generation_service import UnifiedGenerationService
        service = Mock(spec=UnifiedGenerationService)
    except ImportError:
        # 如果导入失败，创建一个通用的Mock服务
        service = Mock()

    service.generate_test_points = AsyncMock()
    service.generate_test_cases_from_points = AsyncMock()
    service.get_task_status = Mock()
    service.cancel_task = Mock()
    return service


@pytest.fixture
def sample_business_type_data():
    """示例业务类型数据"""
    return {
        "code": "RCC",
        "name": "远程空调控制",
        "description": "远程控制车辆空调系统",
        "is_active": True,
        "project_id": 1
    }


@pytest.fixture
def sample_project_data():
    """示例项目数据"""
    return {
        "id": 1,
        "name": "测试项目",
        "description": "用于测试的项目",
        "is_active": True
    }


@pytest.fixture
def sample_test_point_data():
    """示例测试点数据 (使用UnifiedTestCase表中的stage='test_point')"""
    return {
        "id": 1,
        "name": "开启空调测试",
        "description": "测试远程开启空调功能",
        "business_type": "RCC",
        "project_id": 1,
        "status": "draft",  # 使用UnifiedTestCaseStatus枚举值
        "priority": "high",
        "stage": "test_point"  # 指定为测试点阶段
    }


@pytest.fixture
def sample_generation_request():
    """示例生成请求数据"""
    return {
        "business_type": "RCC",
        "project_id": 1,
        "count": 10,
        "complexity_level": "standard",
        "additional_context": "测试生成"
    }


@pytest.fixture
def sample_generation_response():
    """示例生成响应数据"""
    return {
        "success": True,
        "task_id": "test-task-123",
        "message": "生成任务已创建",
        "data": {
            "business_type": "RCC",
            "count": 10
        }
    }


@pytest.fixture
def mock_openai_response():
    """模拟OpenAI API响应"""
    return {
        "choices": [
            {
                "message": {
                    "content": '''
                    {
                        "test_points": [
                            {
                                "id": 1,
                                "name": "开启空调测试",
                                "description": "测试远程开启空调功能",
                                "steps": ["步骤1", "步骤2"]
                            }
                        ]
                    }
                    '''
                }
            }
        ]
    }


@pytest.fixture
def api_client():
    """FastAPI测试客户端fixture"""
    from fastapi.testclient import TestClient
    from src.api.endpoints import app

    client = TestClient(app)
    return client


@pytest.fixture
def mock_redis():
    """模拟Redis连接"""
    redis_mock = Mock()
    redis_mock.get = Mock(return_value=None)
    redis_mock.set = Mock(return_value=True)
    redis_mock.delete = Mock(return_value=True)
    redis_mock.exists = Mock(return_value=False)
    return redis_mock


@pytest.fixture
def temp_project_dir(tmp_path):
    """临时项目目录fixture"""
    project_dir = tmp_path / "test_project"
    project_dir.mkdir()
    return project_dir


@pytest.fixture
def mock_websocket():
    """模拟WebSocket连接"""
    websocket_mock = Mock()
    websocket_mock.accept = Mock()
    websocket_mock.send_text = Mock()
    websocket_mock.close = Mock()
    websocket_mock.receive_text = AsyncMock(return_value="test message")
    return websocket_mock


# 测试前的设置
def pytest_configure(config):
    """pytest配置钩子"""
    # 添加自定义标记
    config.addinivalue_line(
        "markers", "slow: 标记测试为慢速测试"
    )
    config.addinivalue_line(
        "markers", "integration: 集成测试"
    )
    config.addinivalue_line(
        "markers", "unit: 单元测试"
    )


# 测试后的清理
def pytest_unconfigure(config):
    """pytest清理钩子"""
    pass


# 异步测试辅助函数
@pytest.fixture
def async_test_case():
    """异步测试用例辅助函数"""
    async def run_async_test(test_func, *args, **kwargs):
        """运行异步测试函数"""
        return await test_func(*args, **kwargs)
    return run_async_test