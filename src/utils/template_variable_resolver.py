"""
Template Variable Resolver

This module provides functionality to resolve and process template variables
used in prompt generation for test cases and test points.
"""

import logging
import json
from typing import Dict, Any, Optional, List

from ..database.database import DatabaseManager
from ..database.models import UnifiedTestCase, BusinessType
from ..utils.config import Config

logger = logging.getLogger(__name__)


class TemplateVariableResolver:
    """
    Resolves template variables used in prompt generation based on AI generation endpoints.

    Supports 3 core variable types:
    - user_input: User provided input from endpoint additional_context parameter
    - test_points: Test points data from endpoint parameters or database queries
    - test_cases: Test cases data from database based on business_type and project_id
    """

    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db_manager = db_manager or DatabaseManager(Config())

    def resolve_variables(self, business_type: str, project_id: Optional[int] = None,
                         endpoint_params: Optional[Dict[str, Any]] = None,
                         generation_stage: Optional[str] = None) -> Dict[str, Any]:
        """
        Resolve template variables for a given business type based on endpoint parameters and generation stage.
        Implements intelligent variable replacement with anti-duplication and correspondence logic.

        Args:
            business_type: The business type to resolve variables for
            project_id: Project ID from endpoint (optional)
            endpoint_params: Parameters from AI generation endpoints
            generation_stage: Generation stage ('test_point' or 'test_case') (optional)

        Returns:
            Dictionary of resolved template variables with intelligent processing
        """
        logger.info(f"开始解析模板变量 | 业务类型: {business_type} | 生成阶段: {generation_stage} | 项目ID: {project_id}")
        logger.debug(f"端点参数详情: {endpoint_params}")

        variables = {}

        # 1. user_input - from endpoint additional_context
        additional_context = endpoint_params.get('additional_context') if endpoint_params else None
        logger.debug(f"提取用户输入 | additional_context: {additional_context}")

        user_input = self._extract_user_input(additional_context)
        variables['user_input'] = user_input
        logger.info(f"用户输入解析完成 | 长度: {len(user_input) if user_input else 0}")

        # 2. test_points - based on endpoint parameters with intelligent processing
        logger.debug("开始解析测试点数据...")
        test_points_data = self._get_test_points_from_endpoint(business_type, project_id, endpoint_params)

        if test_points_data:
            logger.info(f"找到测试点数据 | 数量: {len(test_points_data) if isinstance(test_points_data, list) else 1}")

            # Apply intelligent processing based on generation stage
            if generation_stage == 'test_point':
                # For test point generation: add anti-duplication warning
                test_points_with_warning = {
                    "warning": "目前已有这些测试点，不要跟这些测试点内容重复。",
                    "test_points": test_points_data
                }
                variables['test_points'] = json.dumps(test_points_with_warning, ensure_ascii=False, indent=2)
                logger.debug("测试点生成阶段：添加防重复警告")
            elif generation_stage == 'test_case':
                # For test case generation: add correspondence requirement
                test_points_with_correspondence = {
                    "instruction": "按照如下的测试点数据扩充内容，生成用例，务必一一对应。",
                    "test_points": test_points_data
                }
                variables['test_points'] = json.dumps(test_points_with_correspondence, ensure_ascii=False, indent=2)
                logger.debug("测试用例生成阶段：添加对应关系要求")
            else:
                variables['test_points'] = json.dumps(test_points_data, ensure_ascii=False, indent=2)
                logger.debug("通用处理：原始测试点数据")
        else:
            variables['test_points'] = ""
            logger.info("未找到测试点数据，设置为空字符串")

        # 3. test_cases - from database with intelligent processing (only for test_case generation stage)
        logger.debug("开始解析测试用例数据...")
        test_cases_data = self._get_test_cases_from_database(business_type, project_id, generation_stage)

        if test_cases_data and generation_stage == 'test_case':
            logger.info(f"找到已有测试用例 | 数量: {len(test_cases_data) if isinstance(test_cases_data, list) else 1}")

            # For test case generation: add anti-duplication warning
            test_cases_with_warning = {
                "warning": "目前已有这些测试用例，不要跟这些测试用例内容重复。",
                "test_cases": test_cases_data
            }
            variables['test_cases'] = json.dumps(test_cases_with_warning, ensure_ascii=False, indent=2)
            logger.debug("测试用例生成阶段：添加防重复警告")
        else:
            # For test_point generation or no data: return empty
            variables['test_cases'] = ""
            if generation_stage != 'test_case':
                logger.info("测试点生成阶段：测试用例变量设置为空")
            else:
                logger.info("未找到已有测试用例，设置为空字符串")

        # 记录最终解析结果摘要
        for var_name, var_value in variables.items():
            value_length = len(var_value) if var_value else 0
            has_template_vars = "{{" in var_value and "}}" in var_value
            logger.debug(f"变量解析结果 | {var_name}: 长度={value_length}, 包含模板变量={has_template_vars}")

        logger.info(f"模板变量解析完成 | 业务类型: {business_type} | 生成阶段: {generation_stage} | 变量数量: {len(variables)}")
        return variables

    def _extract_user_input(self, additional_context: Optional[Dict[str, Any]]) -> str:
        """
        Extract user input from additional_context.
        Supports both dict format (old) and string format (new).

        Args:
            additional_context: Additional context from endpoint

        Returns:
            User input string
        """
        logger.debug(f"开始提取用户输入 | additional_context类型: {type(additional_context)} | 值: {additional_context}")

        if not additional_context:
            logger.debug("additional_context为空，返回空字符串")
            return ""

        # If additional_context is already a string (new format), return as-is
        if isinstance(additional_context, str):
            logger.debug(f"additional_context是字符串格式，直接返回: {additional_context[:100]}...")
            return additional_context

        # If it's a dict (old format), try to get user_input directly
        if isinstance(additional_context, dict):
            logger.debug(f"additional_context是字典格式，包含的键: {list(additional_context.keys())}")

            if 'user_input' in additional_context:
                user_input = str(additional_context['user_input'])
                logger.debug(f"从字典中提取user_input: {user_input[:100]}...")
                return user_input

            # Fall back to converting the entire context to string for simplicity
            try:
                context_str = json.dumps(additional_context, ensure_ascii=False)
                logger.debug(f"将字典转换为JSON字符串: {context_str[:100]}...")
                return context_str
            except (TypeError, ValueError) as e:
                logger.warning(f"JSON序列化失败，使用str转换: {e}")
                return str(additional_context)

        logger.debug(f"未知格式，使用str转换: {str(additional_context)[:100]}...")
        return str(additional_context) if additional_context else ""

    def _get_test_points_from_endpoint(self, business_type: str, project_id: Optional[int],
                                     endpoint_params: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Get test points data based on endpoint parameters.

        Args:
            business_type: The business type
            project_id: Project ID (optional)
            endpoint_params: Parameters from AI generation endpoints

        Returns:
            List of test point dictionaries
        """
        logger.debug(f"开始获取测试点数据 | 业务类型: {business_type} | 项目ID: {project_id}")
        logger.debug(f"端点参数: {endpoint_params}")

        if not endpoint_params:
            logger.debug("端点参数为空，返回空列表")
            return []

        # Scenario 1: test_point_ids → database query
        if 'test_point_ids' in endpoint_params and endpoint_params['test_point_ids']:
            test_point_ids = endpoint_params['test_point_ids']
            logger.debug(f"场景1：通过test_point_ids获取测试点: {test_point_ids}")
            test_points = self._get_test_points_by_ids(test_point_ids, business_type)
            logger.debug(f"获取到测试点数量: {len(test_points)}")
            return test_points

        # Scenario 2: test_points → use directly from endpoint
        if 'test_points' in endpoint_params and endpoint_params['test_points']:
            test_points = endpoint_params['test_points']
            if isinstance(test_points, list):
                logger.debug(f"场景2：直接使用端点的test_points: {len(test_points)}")
            else:
                logger.debug(f"场景2：直接使用端点的test_points: {test_points}")
            return test_points

        # Scenario 3: test_points_data → extract from nested structure
        if 'test_points_data' in endpoint_params and endpoint_params['test_points_data']:
            test_points_data = endpoint_params['test_points_data']
            if isinstance(test_points_data, dict):
                logger.debug(f"场景3：从test_points_data提取: {list(test_points_data.keys())}")
            else:
                logger.debug(f"场景3：从test_points_data提取: {test_points_data}")
            if isinstance(test_points_data, dict) and 'test_points' in test_points_data:
                test_points = test_points_data['test_points']
                if isinstance(test_points, list):
                    logger.debug(f"从test_points_data中提取到测试点数量: {len(test_points)}")
                    return test_points
                else:
                    logger.debug(f"从test_points_data中提取到测试点数量: 1")
                    return test_points

        # Scenario 4: get from current business data if project_id is available
        if project_id:
            logger.debug(f"场景4：从数据库获取业务测试点数据")
            test_points = self._get_business_test_points(business_type, project_id)
            logger.debug(f"从数据库获取到测试点数量: {len(test_points)}")
            return test_points

        logger.debug("所有场景都无法获取测试点，返回空列表")
        return []

    def _get_test_cases_from_database(self, business_type: str, project_id: Optional[int],
                                 generation_stage: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get test cases data from database based on business type, project ID and generation stage.
        Only returns data in test_case generation stage, not in test_point generation stage.

        Args:
            business_type: The business type
            project_id: Project ID (optional)
            generation_stage: Generation stage ('test_point' or 'test_case') (optional)

        Returns:
            List of test case dictionaries
        """
        # Only return test_cases data in test_case generation stage
        # In test_point generation stage, test_cases should be empty as per business logic
        if generation_stage != 'test_case':
            logger.debug(f"Skipping test_cases retrieval for generation_stage: {generation_stage}")
            return []

        if not project_id:
            return []

        try:
            with self.db_manager.get_session() as db:
                # Normalize business_type to uppercase string
                business_type_str = business_type.upper() if isinstance(business_type, str) else str(business_type)

                # Get test cases for this business type and project
                test_cases = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.business_type == business_type_str,
                    UnifiedTestCase.project_id == project_id,
                    UnifiedTestCase.steps.isnot(None)  # Test cases have steps, test points don't
                ).all()

                # Convert to dictionary format
                test_cases_data = []
                for tc in test_cases:
                    tc_dict = {
                        'id': tc.id,
                        'test_case_id': tc.test_case_id,
                        'name': tc.name,
                        'description': tc.description,
                        'module': tc.module,
                        'functional_module': tc.functional_module,
                        'functional_domain': tc.functional_domain,
                        'preconditions': tc.preconditions,
                        'steps': tc.steps,
                        'expected_result': tc.expected_result,
                        'remarks': tc.remarks,
                        'priority': tc.priority,
                        'business_type': tc.business_type if tc.business_type else None,
                        'project_id': tc.project_id,
                        'created_at': tc.created_at.isoformat() if tc.created_at else None,
                        'updated_at': tc.updated_at.isoformat() if tc.updated_at else None
                    }
                    test_cases_data.append(tc_dict)

                return test_cases_data

        except Exception as e:
            logger.error(f"Failed to get test cases for {business_type}, project {project_id}: {e}")
            return []

    def _get_test_points_by_ids(self, test_point_ids: List[int], business_type: str) -> List[Dict[str, Any]]:
        """
        Get test points by their IDs from database.

        Args:
            test_point_ids: List of test point IDs
            business_type: The business type for validation

        Returns:
            List of test point dictionaries
        """
        if not test_point_ids:
            return []

        try:
            with self.db_manager.get_session() as db:
                # Normalize business_type to uppercase string
                business_type_str = business_type.upper() if isinstance(business_type, str) else str(business_type)

                # Get test points by IDs and business type
                test_points = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.id.in_(test_point_ids),
                    UnifiedTestCase.business_type == business_type_str,
                    UnifiedTestCase.steps.is_(None)  # Test points don't have steps
                ).all()

                # Convert to dictionary format
                test_points_data = []
                for tp in test_points:
                    tp_dict = {
                        'id': tp.id,
                        'test_point_id': tp.test_case_id,  # Using test_case_id as test_point_id
                        'title': tp.name,
                        'description': tp.description,
                        'module': tp.module,
                        'functional_module': tp.functional_module,
                        'functional_domain': tp.functional_domain,
                        'priority': tp.priority,
                        'business_type': tp.business_type if tp.business_type else None,
                        'project_id': tp.project_id,
                        'created_at': tp.created_at.isoformat() if tp.created_at else None,
                        'updated_at': tp.updated_at.isoformat() if tp.updated_at else None
                    }
                    test_points_data.append(tp_dict)

                return test_points_data

        except Exception as e:
            logger.error(f"Failed to get test points by IDs for {business_type}: {e}")
            return []

    def _get_business_test_points(self, business_type: str, project_id: int) -> List[Dict[str, Any]]:
        """
        Get test points for a business type and project.

        Args:
            business_type: The business type
            project_id: Project ID

        Returns:
            List of test point dictionaries
        """
        try:
            with self.db_manager.get_session() as db:
                # Convert string to enum if needed
                # Normalize business_type to uppercase string
                business_type_str = business_type.upper() if isinstance(business_type, str) else str(business_type)

                # Get test points for this business type and project
                test_points = db.query(UnifiedTestCase).filter(
                    UnifiedTestCase.business_type == business_type_str,
                    UnifiedTestCase.project_id == project_id,
                    UnifiedTestCase.steps.is_(None)  # Test points don't have steps
                ).all()

                # Convert to dictionary format
                test_points_data = []
                for tp in test_points:
                    tp_dict = {
                        'id': tp.id,
                        'test_point_id': tp.test_case_id,
                        'title': tp.name,
                        'description': tp.description,
                        'module': tp.module,
                        'functional_module': tp.functional_module,
                        'functional_domain': tp.functional_domain,
                        'priority': tp.priority,
                        'business_type': tp.business_type if tp.business_type else None,
                        'project_id': tp.project_id,
                        'created_at': tp.created_at.isoformat() if tp.created_at else None,
                        'updated_at': tp.updated_at.isoformat() if tp.updated_at else None
                    }
                    test_points_data.append(tp_dict)

                return test_points_data

        except Exception as e:
            logger.error(f"Failed to get business test points for {business_type}, project {project_id}: {e}")
            return []

    def get_available_variables(self, business_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get available template variables from database with metadata.

        Args:
            business_type: Optional business type filter

        Returns:
            List of template variable dictionaries with metadata
        """
        try:
            logger.info(f"Getting available template variables for business_type: {business_type}")

            # 返回实际工作的3个核心变量
            core_variables = [
                {
                    "name": "{{user_input}}",
                    "type": "user_input",
                    "business_type": None,
                    "description": "用户在API调用时提供的额外上下文信息（来自additional_context参数）",
                    "default_value": None,
                    "example": "用户输入：生成50个风险管理相关的测试点"
                },
                {
                    "name": "{{test_points}}",
                    "type": "reference_data",
                    "business_type": None,
                    "description": "参考测试点数据，根据生成阶段智能包装：测试点生成时添加防重复警告，测试用例生成时添加一一对应要求",
                    "default_value": None,
                    "example": "参考测试点：包含JSON格式的测试点数组，带有智能包装说明"
                },
                {
                    "name": "{{test_cases}}",
                    "type": "reference_data",
                    "business_type": None,
                    "description": "参考测试用例数据，仅在测试用例生成阶段可用，添加防重复警告",
                    "default_value": None,
                    "example": "参考测试用例：包含JSON格式的测试用例数组，仅在测试用例生成时使用"
                }
            ]

            logger.info(f"✅ Retrieved {len(core_variables)} core template variables")
            return core_variables

        except Exception as e:
            logger.error(f"Error getting available template variables: {e}")
            return []
      

