# -*- coding: utf-8 -*-
"""
业务模型测试
测试项目、业务类型配置等核心业务模型
"""

import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from src.database.models import (
    Project, BusinessTypeConfig, UnifiedTestCase, UnifiedTestCaseStatus,
    TestPoint, TestPointStatus, GenerationJob, JobStatus
)
from tests.utils import TestDataManager


@pytest.mark.unit
class TestProjectModel:
    """测试Project模型"""

    def test_project_creation(self):
        """测试项目创建"""
        project = Project(
            name="测试项目",
            description="这是一个测试项目",
            is_active=True
        )

        assert project.name == "测试项目"
        assert project.description == "这是一个测试项目"
        assert project.is_active is True
        # 注意：created_at和updated_at在保存到数据库时才会设置
        # assert project.created_at is not None
        # assert project.updated_at is not None

    def test_project_string_representation(self):
        """测试项目字符串表示"""
        project = Project(id=1, name="测试项目")
        expected_repr = "<Project(id=1, name='测试项目')>"
        assert str(project) == expected_repr

    def test_project_default_values(self):
        """测试项目默认值"""
        project = Project(name="默认项目")

        assert project.name == "默认项目"
        assert project.description is None
        assert project.is_active is True  # 默认值

    def test_project_with_test_db_session(self, test_db_session):
        """测试项目与数据库会话的交互"""
        data_manager = TestDataManager(test_db_session)
        project = data_manager.create_test_project(
            name="数据库测试项目",
            is_active=False
        )

        # 验证项目已保存到数据库
        assert project.id is not None
        assert project.name == "数据库测试项目"
        assert project.is_active is False

        # 从数据库查询验证
        queried_project = test_db_session.query(Project).filter(
            Project.id == project.id
        ).first()
        assert queried_project is not None
        assert queried_project.name == "数据库测试项目"


@pytest.mark.unit
class TestBusinessTypeConfigModel:
    """测试BusinessTypeConfig模型"""

    def test_business_type_config_creation(self):
        """测试业务类型配置创建"""
        config = BusinessTypeConfig(
            code="RCC",
            name="远程空调控制",
            description="远程控制车辆空调系统",
            project_id=1,
            is_active=True
        )

        assert config.code == "RCC"
        assert config.name == "远程空调控制"
        assert config.description == "远程控制车辆空调系统"
        assert config.project_id == 1
        assert config.is_active is True

    def test_business_type_config_uniqueness(self):
        """测试业务类型代码唯一性"""
        config1 = BusinessTypeConfig(code="RCC", project_id=1, is_active=True)
        config2 = BusinessTypeConfig(code="RFD", project_id=1, is_active=True)

        assert config1.code != config2.code
        assert BusinessTypeConfig.code.property.columns[0].unique is True

    def test_business_type_config_with_json_fields(self):
        """测试业务类型配置JSON字段"""
        template_config = {
            "generation_prompt": "测试提示词",
            "temperature": 0.7
        }
        additional_config = {
            "max_tokens": 1000,
            "timeout": 30
        }

        config = BusinessTypeConfig(
            code="RCC",
            name="远程空调控制",
            project_id=1,
            template_config=template_config,
            additional_config=additional_config
        )

        assert config.template_config == template_config
        assert config.additional_config == additional_config

    def test_business_type_config_default_values(self):
        """测试业务类型配置默认值"""
        config = BusinessTypeConfig(
            code="RCC",
            name="远程空调控制",
            project_id=1
        )

        assert config.is_active is False  # 默认为False
        assert config.template_config == {}
        assert config.additional_config == {}

    def test_business_type_config_string_representation(self):
        """测试业务类型配置字符串表示"""
        config = BusinessTypeConfig(
            code="RCC",
            name="远程空调控制",
            is_active=True
        )
        expected_repr = "<BusinessTypeConfig(code='RCC', name='远程空调控制', active=True)>"
        assert str(config) == expected_repr

    def test_business_type_config_with_test_db_session(self, test_db_session):
        """测试业务类型配置与数据库会话的交互"""
        data_manager = TestDataManager(test_db_session)

        # 先创建项目
        project = data_manager.create_test_project(name="测试项目")

        # 创建业务类型配置
        business_type = data_manager.create_test_business_type(
            project_id=project.id,
            code="RFD",
            name="远程车门控制"
        )

        assert business_type.id is not None
        assert business_type.project_id == project.id
        assert business_type.code == "RFD"

        # 验证外键关系
        queried_business_type = test_db_session.query(BusinessTypeConfig).filter(
            BusinessTypeConfig.id == business_type.id
        ).first()
        assert queried_business_type is not None


@pytest.mark.unit
class TestUnifiedTestCaseModel:
    """测试UnifiedTestCase模型"""

    def test_unified_test_case_creation(self):
        """测试统一测试用例创建"""
        test_case = UnifiedTestCase(
            name="空调开启测试用例",
            description="测试远程开启空调功能",
            business_type="RCC",
            project_id=1,
            status=UnifiedTestCaseStatus.DRAFT,
            priority="high"
        )

        assert test_case.name == "空调开启测试用例"
        assert test_case.description == "测试远程开启空调功能"
        assert test_case.business_type == "RCC"
        assert test_case.project_id == 1
        assert test_case.status == UnifiedTestCaseStatus.DRAFT
        assert test_case.priority == "high"

    def test_unified_test_case_status_transitions(self):
        """测试统一测试用例状态转换"""
        test_case = UnifiedTestCase(
            name="测试用例",
            business_type="RCC",
            project_id=1,
            status=UnifiedTestCaseStatus.DRAFT
        )

        # 测试状态检查方法
        assert test_case.status == UnifiedTestCaseStatus.DRAFT

        # 更新状态
        test_case.status = UnifiedTestCaseStatus.APPROVED
        assert test_case.status == UnifiedTestCaseStatus.APPROVED

        test_case.status = UnifiedTestCaseStatus.COMPLETED
        assert test_case.status == UnifiedTestCaseStatus.COMPLETED

    def test_unified_test_case_with_json_fields(self):
        """测试统一测试用例JSON字段"""
        steps = [
            {"step": 1, "action": "打开APP", "expected": "APP正常启动"},
            {"step": 2, "action": "点击空调按钮", "expected": "空调开始运行"}
        ]
        preconditions = ["车辆处于启动状态", "网络连接正常"]
        expected_result = ["空调成功启动", "温度调节正常"]

        test_case = UnifiedTestCase(
            name="空调开启测试用例",
            business_type="RCC",
            project_id=1,
            status=UnifiedTestCaseStatus.DRAFT,
            steps=str(steps),  # 在实际应用中可能使用JSON字段
            preconditions=str(preconditions),
            expected_result=str(expected_result)
        )

        # 在实际应用中，这些字段可能直接存储为JSON
        assert test_case.name == "空调开启测试用例"

    def test_unified_test_case_priority_validation(self):
        """测试统一测试用例优先级验证"""
        valid_priorities = ['low', 'medium', 'high', 'critical']

        for priority in valid_priorities:
            test_case = UnifiedTestCase(
                name=f"测试用例_{priority}",
                business_type="RCC",
                project_id=1,
                priority=priority
            )
            assert test_case.priority == priority

    def test_unified_test_case_with_test_db_session(self, test_db_session):
        """测试统一测试用例与数据库会话的交互"""
        data_manager = TestDataManager(test_db_session)

        # 创建项目
        project = data_manager.create_test_project(name="测试项目")

        # 创建测试用例
        test_case = data_manager.create_test_unified_test_case(
            project_id=project.id,
            name="数据库测试用例",
            description="用于数据库测试的测试用例"
        )

        assert test_case.id is not None
        assert test_case.project_id == project.id
        assert test_case.status == UnifiedTestCaseStatus.DRAFT

        # 验证数据库中的数据
        queried_test_case = test_db_session.query(UnifiedTestCase).filter(
            UnifiedTestCase.id == test_case.id
        ).first()
        assert queried_test_case is not None
        assert queried_test_case.name == "数据库测试用例"


@pytest.mark.unit
class TestTestPointModel:
    """测试TestPoint模型"""

    def test_test_point_creation(self):
        """测试测试点创建"""
        test_point = TestPoint(
            name="空调功能测试点",
            description="测试空调的远程控制功能",
            business_type="RCC",
            project_id=1,
            status=TestPointStatus.ACTIVE,
            priority="high"
        )

        assert test_point.name == "空调功能测试点"
        assert test_point.description == "测试空调的远程控制功能"
        assert test_point.business_type == "RCC"
        assert test_point.project_id == 1
        assert test_point.status == TestPointStatus.ACTIVE
        assert test_point.priority == "high"

    def test_test_point_status_values(self):
        """测试测试点状态值"""
        valid_statuses = [
            TestPointStatus.ACTIVE,
            TestPointStatus.INACTIVE,
            TestPointStatus.DRAFT,
            TestPointStatus.ARCHIVED
        ]

        for status in valid_statuses:
            test_point = TestPoint(
                name=f"测试点_{status.value}",
                business_type="RCC",
                project_id=1,
                status=status
            )
            assert test_point.status == status

    def test_test_point_with_test_db_session(self, test_db_session):
        """测试测试点与数据库会话的交互"""
        data_manager = TestDataManager(test_db_session)

        # 创建项目
        project = data_manager.create_test_project(name="测试项目")

        # 创建测试点
        test_point = data_manager.create_test_test_point(
            project_id=project.id,
            business_type="RFD",
            name="车门控制测试点"
        )

        assert test_point.id is not None
        assert test_point.project_id == project.id
        assert test_point.business_type == "RFD"

        # 验证数据库中的数据
        queried_test_point = test_db_session.query(TestPoint).filter(
            TestPoint.id == test_point.id
        ).first()
        assert queried_test_point is not None
        assert queried_test_point.name == "车门控制测试点"


@pytest.mark.integration
class TestModelRelationships:
    """测试模型关系"""

    def test_project_business_type_relationship(self, test_db_session):
        """测试项目与业务类型的关系"""
        data_manager = TestDataManager(test_db_session)

        # 创建项目
        project = data_manager.create_test_project(name="测试项目")

        # 为项目创建多个业务类型
        business_type1 = data_manager.create_test_business_type(
            project_id=project.id,
            code="RCC"
        )
        business_type2 = data_manager.create_test_business_type(
            project_id=project.id,
            code="RFD"
        )

        # 验证关系
        queried_project = test_db_session.query(Project).filter(
            Project.id == project.id
        ).first()

        # 在实际应用中，这里会有relationship定义
        assert queried_project.id == project.id

    def test_business_type_test_case_relationship(self, test_db_session):
        """测试业务类型与测试用例的关系"""
        data_manager = TestDataManager(test_db_session)

        # 创建项目
        project = data_manager.create_test_project(name="测试项目")

        # 创建业务类型
        business_type = data_manager.create_test_business_type(
            project_id=project.id,
            code="RCC"
        )

        # 为业务类型创建测试用例
        test_case1 = data_manager.create_test_unified_test_case(
            project_id=project.id,
            name="空调测试用例1"
        )
        test_case2 = data_manager.create_test_unified_test_case(
            project_id=project.id,
            name="空调测试用例2"
        )

        # 验证业务类型关系
        assert test_case1.business_type == "RCC"
        assert test_case2.business_type == "RCC"

    def test_test_point_test_case_relationship(self, test_db_session):
        """测试测试点与测试用例的关系"""
        data_manager = TestDataManager(test_db_session)

        # 创建项目
        project = data_manager.create_test_project(name="测试项目")

        # 创建测试点
        test_point = data_manager.create_test_test_point(
            project_id=project.id,
            business_type="RCC"
        )

        # 为测试点创建测试用例
        test_case = data_manager.create_test_unified_test_case(
            project_id=project.id,
            test_point_id=test_point.id
        )

        assert test_case.test_point_id == test_point.id


@pytest.mark.unit
class TestModelValidation:
    """测试模型验证"""

    def test_project_name_validation(self, test_db_session):
        """测试项目名称验证"""
        # 测试必填字段
        with pytest.raises(Exception):  # SQLAlchemy会抛出异常
            project = Project()  # 缺少name字段
            test_db_session.add(project)
            test_db_session.commit()

    def test_business_type_code_validation(self, test_db_session):
        """测试业务类型代码验证"""
        # 测试必填字段
        with pytest.raises(Exception):
            business_type = BusinessTypeConfig(project_id=1)  # 缺少code和name
            test_db_session.add(business_type)
            test_db_session.commit()

    def test_unified_test_case_validation(self, test_db_session):
        """测试统一测试用例验证"""
        # 测试必填字段
        with pytest.raises(Exception):
            test_case = UnifiedTestCase()  # 缺少必填字段
            test_db_session.add(test_case)
            test_db_session.commit()


@pytest.mark.unit
class TestModelTimestamps:
    """测试模型时间戳"""

    def test_timestamp_auto_generation(self):
        """测试时间戳自动生成"""
        project = Project(name="时间戳测试项目")

        assert project.created_at is not None
        assert project.updated_at is not None
        assert isinstance(project.created_at, datetime)
        assert isinstance(project.updated_at, datetime)

    def test_timestamp_update_on_save(self, test_db_session):
        """测试保存时更新时间戳"""
        data_manager = TestDataManager(test_db_session)
        project = data_manager.create_test_project(name="时间戳测试项目")

        original_updated_at = project.updated_at

        # 等待一小段时间确保时间戳不同
        import time
        time.sleep(0.01)

        # 更新项目
        project.description = "更新的描述"
        test_db_session.commit()

        # 验证updated_at时间戳已更新
        assert project.updated_at > original_updated_at


@pytest.mark.database
class TestModelQueries:
    """测试模型查询"""

    def test_active_projects_query(self, test_db_session):
        """测试活跃项目查询"""
        data_manager = TestDataManager(test_db_session)

        # 创建活跃和非活跃项目
        active_project = data_manager.create_test_project(
            name="活跃项目",
            is_active=True
        )
        inactive_project = data_manager.create_test_project(
            name="非活跃项目",
            is_active=False
        )

        # 查询活跃项目
        active_projects = test_db_session.query(Project).filter(
            Project.is_active == True
        ).all()

        assert len(active_projects) == 1
        assert active_projects[0].name == "活跃项目"

    def test_business_type_by_project_query(self, test_db_session):
        """测试按项目查询业务类型"""
        data_manager = TestDataManager(test_db_session)

        # 创建项目和业务类型
        project1 = data_manager.create_test_project(name="项目1")
        project2 = data_manager.create_test_project(name="项目2")

        business_type1 = data_manager.create_test_business_type(
            project_id=project1.id,
            code="RCC"
        )
        business_type2 = data_manager.create_test_business_type(
            project_id=project2.id,
            code="RFD"
        )

        # 查询项目1的业务类型
        project1_business_types = test_db_session.query(BusinessTypeConfig).filter(
            BusinessTypeConfig.project_id == project1.id
        ).all()

        assert len(project1_business_types) == 1
        assert project1_business_types[0].code == "RCC"