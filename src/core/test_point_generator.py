# -*- coding: utf-8 -*-
"""
Test Point Generation functionality for two-stage test case generation.

This module provides dedicated functionality for generating test points
as the first stage in the two-stage test case generation process.
"""

import logging
import json
import time
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

from ..llm.llm_client import LLMClient
from ..utils.config import Config
from ..utils.database_prompt_builder import DatabasePromptBuilder
from ..core.json_extractor import JSONExtractor
from ..core.enhanced_json_validator import EnhancedJSONValidator, ValidationSeverity
from ..database.database import DatabaseManager
from ..database.operations import DatabaseOperations
from ..database.models import BusinessType, UnifiedTestCase, KnowledgeEntity, KnowledgeRelation, TestCaseEntity, EntityType, BusinessTypeConfig, TestPoint


class TestPointGenerator:
    """
    Dedicated class for generating test points using LLMs.

    This class handles the first stage of the two-stage generation process,
    converting business requirements into structured test points.
    """

    def __init__(self, config: Config):
        """
        Initialize the test point generator.

        Args:
            config (Config): Configuration object
        """
        self.config = config
        self.llm_client = LLMClient(config)
        self.json_extractor = JSONExtractor()
        self.enhanced_validator = EnhancedJSONValidator()
        self.prompt_builder = DatabasePromptBuilder(config)
        self.db_manager = DatabaseManager(config)

    def generate_test_points(self, business_type: str, additional_context: Optional[Dict[str, Any]] = None, project_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Generate test points for a specific business type.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)
            additional_context (Optional[Dict[str, Any]]): Additional context for generation
            project_id (Optional[int]): Project ID for getting existing test points

        Returns:
            Optional[Dict[str, Any]]: Generated test points JSON or None if failed
        """
        start_time = time.time()

        try:
            # Validate business type
            if not self._validate_business_type(business_type):
                raise ValueError(f"Invalid or inactive business type: {business_type}")

            # Get both system and user prompts from prompt combination
            system_prompt, user_prompt = self.prompt_builder.get_two_stage_prompts(
                business_type, 'test_point'
            )
            if system_prompt is None or user_prompt is None:
                raise RuntimeError(f"无法为 {business_type} 获取测试点生成提示词组合")

            # Apply template variables to user prompt
            user_prompt = self.prompt_builder._apply_template_variables(
                content=user_prompt,
                additional_context=additional_context,
                business_type=business_type,
                project_id=project_id,  # Use provided project_id
                endpoint_params={
                    'additional_context': additional_context,
                    'generation_stage': 'test_point'  # Explicitly identify generation stage
                } if additional_context else {'generation_stage': 'test_point'}
            )

            logger.info(f"开始生成测试点 | 业务类型: {business_type} | 用户提示词长度: {len(user_prompt)}")

            # Generate test points using LLM
            llm_start = time.time()
            response = self.llm_client.generate_test_cases(system_prompt, user_prompt)
            llm_time = time.time() - llm_start

            if response is None:
                raise RuntimeError("Failed to get response from LLM")

            # Extract and validate JSON using enhanced validator
            json_start = time.time()
            validation_result = self.enhanced_validator.validate_and_extract_json(
                response,
                expected_structure='test_points',
                strict_mode=False
            )
            json_time = time.time() - json_start

            if not validation_result.is_valid or validation_result.data is None:
                logger.error("测试点JSON验证失败")
                logger.error(f"LLM Response (first 500 chars): {response[:500]}...")
                self._log_enhanced_validation_errors(validation_result)
                self._analyze_failed_response(response)

                # 尝试容错恢复
                recovery_data = self._attempt_json_recovery(response, business_type)
                if recovery_data:
                    logger.warning("JSON验证失败，但通过容错机制恢复了部分数据")
                    json_result = recovery_data
                else:
                    raise RuntimeError("JSON validation failed - no valid test points found in LLM response")

            # Log warnings and info if any (only for original validation)
            if validation_result.has_issues():
                self._log_validation_issues(validation_result)

            # Use recovered data if available, otherwise use validation result
            json_result = recovery_data if recovery_data else validation_result.data

            # Report success
            test_points = json_result.get('test_points', [])
            test_points_count = len(test_points) if isinstance(test_points, list) else 0
            total_time = time.time() - start_time

            logger.info(f"测试点生成成功 | 业务类型: {business_type} | 测试点数量: {test_points_count} | "
                       f"总耗时: {total_time:.2f}s | LLM耗时: {llm_time:.2f}s | JSON解析耗时: {json_time:.2f}s")

            # Add metadata
            json_result['generation_metadata'] = {
                'business_type': business_type,
                'generation_stage': 'test_point',
                'generation_time': total_time,
                'llm_time': llm_time,
                'json_extraction_time': json_time,
                'test_points_count': test_points_count,
                'timestamp': time.time()
            }

            return json_result

        except Exception as e:
            total_time = time.time() - start_time
            error_msg = f"Error generating test points for {business_type}: {str(e)}"
            logger.error(f"{error_msg} | 耗时: {total_time:.2f}s")
            raise Exception(error_msg) from e

    def generate_batch_test_points(self, business_types: List[str],
                                  additional_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate test points for multiple business types in batch.

        Args:
            business_types (List[str]): List of business types
            additional_context (Optional[Dict[str, Any]]): Additional context for all generations

        Returns:
            Dict[str, Any]: Batch generation results with metadata
        """
        start_time = time.time()
        results = {
            'successful': {},
            'failed': {},
            'summary': {
                'total_business_types': len(business_types),
                'successful_count': 0,
                'failed_count': 0,
                'total_test_points': 0,
                'total_time': 0
            }
        }

        logger.info(f"开始批量生成测试点 | 业务类型数量: {len(business_types)} | 业务类型: {business_types}")

        for business_type in business_types:
            try:
                business_context = additional_context.copy() if additional_context else {}
                business_context['current_business_type'] = business_type

                test_points_result = self.generate_test_points(business_type, business_context)

                if test_points_result:
                    results['successful'][business_type] = test_points_result
                    test_points_count = len(test_points_result.get('test_points', []))
                    results['summary']['successful_count'] += 1
                    results['summary']['total_test_points'] += test_points_count
                    logger.info(f"批量生成成功 | 业务类型: {business_type} | 测试点数量: {test_points_count}")
                else:
                    results['failed'][business_type] = {'error': 'No test points generated'}
                    results['summary']['failed_count'] += 1
                    logger.error(f"批量生成失败 | 业务类型: {business_type} | 原因: 未生成测试点")

            except Exception as e:
                results['failed'][business_type] = {'error': str(e)}
                results['summary']['failed_count'] += 1
                logger.error(f"批量生成失败 | 业务类型: {business_type} | 错误: {str(e)}")

        # Update summary
        total_time = time.time() - start_time
        results['summary']['total_time'] = total_time

        logger.info(f"批量生成完成 | 成功: {results['summary']['successful_count']} | "
                   f"失败: {results['summary']['failed_count']} | "
                   f"总测试点: {results['summary']['total_test_points']} | "
                   f"总耗时: {total_time:.2f}s")

        return results

    def save_test_points_to_database(self, test_points_data: Dict[str, Any],
                                    business_type: str,
                                    project_id: Optional[int] = None) -> Optional[str]:
        """
        Save generated test points to database.

        Args:
            test_points_data (Dict[str, Any]): Test points data
            business_type (str): Business type
            project_id (Optional[int]): Project ID

        Returns:
            Optional[str]: Project ID if successful, None otherwise
        """
        try:
            with self.db_manager.get_session() as db:
                # Use provided project_id directly
                if not project_id:
                    raise ValueError("Project ID is required for saving test points")

                # Store test points to the correct TestPoint table with transaction protection
                test_points_list = test_points_data.get('test_points', [])
                stored_test_points = []

                if not test_points_list:
                    logger.warning("没有测试点数据需要保存")
                    return str(project_id)

                # Pre-calculate existing count outside of transaction to avoid counting uncommitted records
                existing_count = db.query(TestPoint).filter(
                    TestPoint.project_id == project_id,
                    TestPoint.business_type == BusinessType(business_type.upper())
                ).count()

                try:
                    # Begin transaction for all test points
                    for i, test_point_data in enumerate(test_points_list):
                        try:
                            # Generate unique test point ID using pre-calculated count
                            provided_id = test_point_data.get('test_point_id')
                            if provided_id:
                                test_point_id = provided_id
                            else:
                                test_point_id = f"{business_type.upper()}{existing_count + i + 1:03d}"

                            # Validate test point data
                            if not test_point_data.get('title'):
                                raise ValueError(f"Test point {i+1} missing title")

                            # Create TestPoint record
                            test_point = TestPoint(
                                project_id=project_id,
                                business_type=BusinessType(business_type.upper()),
                                test_point_id=test_point_id,
                                title=test_point_data.get('title', ''),
                                description=test_point_data.get('description', ''),
                                priority=test_point_data.get('priority', 'medium'),
                                status="draft"
                            )
                            db.add(test_point)
                            stored_test_points.append(test_point)

                        except Exception as e:
                            logger.error(f"Test point {i+1} 验证失败: {str(e)}")
                            failed_count += 1
                            # 在事务中，任何单个失败都应该导致整体回滚
                            raise

                    # If we got here, all test points are valid, commit the transaction
                    db.commit()

                    if failed_count > 0:
                        logger.warning(f"部分测试点创建失败，但事务已回滚: {failed_count}/{len(test_points_list)}")
                        db.rollback()
                        raise RuntimeError(f"Failed to create {failed_count} test points, transaction rolled back")

                except Exception as e:
                    # Rollback on any error
                    db.rollback()
                    logger.error(f"测试点保存事务失败，已回滚: {str(e)}")
                    raise

                # Refresh all test points to get their IDs
                for tp in stored_test_points:
                    db.refresh(tp)

                logger.info(f"测试点已保存到数据库 | 业务类型: {business_type} | "
                           f"测试点数量: {len(stored_test_points)} | 项目ID: {project_id}")

                return str(project_id)

        except Exception as e:
            logger.error(f"保存测试点到数据库失败 | 业务类型: {business_type} | 错误: {str(e)}")
            return None

    def _validate_business_type(self, business_type: str) -> bool:
        """
        Validate business type using the dynamic system.

        Args:
            business_type (str): Business type code

        Returns:
            bool: True if business type is valid and active, False otherwise
        """
        try:
            with self.db_manager.get_session() as db:
                # Check if business type exists in BusinessTypeConfig and is active
                business_config = db.query(BusinessTypeConfig).filter(
                    BusinessTypeConfig.code == business_type.upper(),
                    BusinessTypeConfig.is_active == True
                ).first()

                return business_config is not None

        except Exception as e:
            logger.error(f"验证业务类型失败 | {business_type}: {e}")
            return False

    def _validate_test_points_structure(self, test_points_data: Dict[str, Any]) -> bool:
        """
        Validate the structure of generated test points.

        Args:
            test_points_data (Dict[str, Any]): Test points data to validate

        Returns:
            bool: True if structure is valid, False otherwise
        """
        try:
            # Check if test_points field exists and is a list
            test_points = test_points_data.get('test_points')
            if not isinstance(test_points, list) or len(test_points) == 0:
                return False

            # Validate each test point
            for test_point in test_points:
                if not isinstance(test_point, dict):
                    return False

                # Check required fields
                required_fields = ['id', 'title', 'description']
                for field in required_fields:
                    if field not in test_point or not test_point[field]:
                        return False

            return True

        except Exception as e:
            logger.error(f"验证测试点结构失败: {e}")
            return False

    def _analyze_failed_response(self, response: str) -> None:
        """
        Analyze failed LLM response for debugging.

        Args:
            response (str): Failed LLM response
        """
        try:
            # Log response length and first few characters
            logger.debug(f"失败响应长度: {len(response)}")
            logger.debug(f"失败响应开头: {response[:200]}...")

            # Check for common issues
            if not response.strip():
                logger.warning("LLM响应为空")
            elif '```json' not in response and '{' not in response:
                logger.warning("响应中未找到JSON格式")
            elif response.count('{') != response.count('}'):
                logger.warning("JSON括号不匹配")

        except Exception as e:
            logger.error(f"分析失败响应时出错: {e}")

    def get_test_points_statistics(self, business_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get statistics about generated test points.

        Args:
            business_type (Optional[str]): Filter by business type

        Returns:
            Dict[str, Any]: Statistics about test points
        """
        try:
            with self.db_manager.get_session() as db:
                # Query test points from TestPoint table
                from ..database.models import TestPoint

                query = db.query(TestPoint)

                if business_type:
                    query = query.filter(TestPoint.business_type == BusinessType(business_type.upper()))

                test_points = query.all()

                # Calculate statistics
                total_test_points = len(test_points)
                business_type_counts = {}
                priority_counts = {'high': 0, 'medium': 0, 'low': 0}

                for test_point in test_points:
                    # Count by business type
                    bt = test_point.business_type.value if test_point.business_type else 'unknown'
                    business_type_counts[bt] = business_type_counts.get(bt, 0) + 1

                    # Count by priority
                    priority = test_point.priority or 'medium'
                    priority_counts[priority] = priority_counts.get(priority, 0) + 1

                return {
                    'total_test_points': total_test_points,
                    'business_type_counts': business_type_counts,
                    'priority_counts': priority_counts,
                    'filter_business_type': business_type
                }

        except Exception as e:
            logger.error(f"获取测试点统计失败: {e}")
            return {
                'total_test_points': 0,
                'business_type_counts': {},
                'priority_counts': {'high': 0, 'medium': 0, 'low': 0},
                'filter_business_type': business_type,
                'error': str(e)
            }
    def _log_enhanced_validation_errors(self, validation_result):
        """Log enhanced validation errors with detailed information."""
        logger.error(f"JSON验证失败 - 错误数量: {len(validation_result.errors)}")

        for i, error in enumerate(validation_result.errors):
            error_msg = f"错误 {i+1}: [{error.code}] {error.message}"
            if error.line_number:
                error_msg += f" (行 {error.line_number}"
                if error.column_number:
                    error_msg += f", 列 {error.column_number}"
                error_msg += ")"
            if error.suggestion:
                error_msg += f" - 建议: {error.suggestion}"
            logger.error(error_msg)

            if error.context:
                logger.error(f"上下文:\n{error.context}")

    def _log_validation_issues(self, validation_result):
        """Log validation warnings and info messages."""
        summary = validation_result.get_summary()

        if summary['warning_count'] > 0:
            logger.warning(f"JSON验证警告数量: {summary['warning_count']}")
            for warning in validation_result.warnings:
                warning_msg = f"警告: [{warning.code}] {warning.message}"
                if warning.suggestion:
                    warning_msg += f" - 建议: {warning.suggestion}"
                logger.warning(warning_msg)

        if summary['info_count'] > 0:
            logger.info(f"JSON验证信息数量: {summary['info_count']}")
            for info in validation_result.info:
                info_msg = f"信息: [{info.code}] {info.message}"
                if info.suggestion:
                    info_msg += f" - 建议: {info.suggestion}"
                logger.info(info_msg)

    def _attempt_json_recovery(self, response: str, business_type: str) -> Optional[Dict[str, Any]]:
        """
        尝试从失败的LLM响应中恢复JSON数据。

        Args:
            response: LLM原始响应
            business_type: 业务类型

        Returns:
            恢复的JSON数据，如果无法恢复则返回None
        """
        try:
            # 策略1: 尝试提取任何可能的测试点数据
            import re

            # 查找任何看起来像测试点的模式
            patterns = [
                r'"test_point_id":\s*"([^"]+)"',
                r'"title":\s*"([^"]+)"',
                r'"description":\s*"([^"]+)"',
            ]

            test_points = []
            lines = response.split('\n')
            current_test_point = {}

            for line in lines:
                # 检查是否开始新的测试点
                if '"test_point_id"' in line or re.search(r'测试点\d+', line):
                    if current_test_point:
                        test_points.append(current_test_point)
                    current_test_point = {}

                # 尝试提取基本信息
                for pattern in patterns:
                    match = re.search(pattern, line)
                    if match:
                        if 'test_point_id' in pattern:
                            current_test_point['test_point_id'] = match.group(1)
                        elif 'title' in pattern:
                            current_test_point['title'] = match.group(1)
                        elif 'description' in pattern:
                            current_test_point['description'] = match.group(1)

            # 添加最后一个测试点
            if current_test_point:
                test_points.append(current_test_point)

            if test_points:
                logger.info(f"从失败响应中恢复了 {len(test_points)} 个测试点")
                return {
                    'test_points': test_points,
                    'business_type': business_type,
                    'generation_metadata': {
                        'recovery_mode': True,
                        'original_response_length': len(response),
                        'recovered_test_points': len(test_points)
                    }
                }

            # 策略2: 尝试生成默认测试点
            if business_type:
                logger.warning(f"无法从响应中提取数据，为 {business_type} 生成默认测试点")
                default_test_points = [
                    {
                        'test_point_id': f"{business_type.upper()}001",
                        'title': f"{business_type}功能验证",
                        'description': f"验证{business_type}的基本功能",
                        'priority': 'medium'
                    },
                    {
                        'test_point_id': f"{business_type.upper()}002",
                        'title': f"{business_type}异常处理",
                        'description': f"验证{business_type}的异常处理机制",
                        'priority': 'high'
                    }
                ]

                return {
                    'test_points': default_test_points,
                    'business_type': business_type,
                    'generation_metadata': {
                        'fallback_mode': True,
                        'business_type': business_type,
                        'generated_test_points': len(default_test_points)
                    }
                }

            return None

        except Exception as e:
            logger.error(f"JSON恢复过程中出错: {e}")
            return None
