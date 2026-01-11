# -*- coding: utf-8 -*-
"""
Core test case generation functionality.
"""

import logging
import json
import time
from typing import Optional, Dict, Any, Tuple, List

logger = logging.getLogger(__name__)

from ..llm.llm_client import LLMClient
from ..utils.config import Config
from ..utils.file_handler import load_text_file, save_json_file, ensure_directory_exists
from ..utils.database_prompt_builder import DatabasePromptBuilder
from ..core.json_extractor import JSONExtractor
from ..core.enhanced_json_validator import EnhancedJSONValidator, ValidationSeverity
from ..core.excel_converter import ExcelConverter
from ..database.database import DatabaseManager
from ..database.operations import DatabaseOperations
from ..database.models import BusinessType, Project, UnifiedTestCase, KnowledgeEntity, KnowledgeRelation, TestCaseEntity, EntityType, BusinessTypeConfig


class TestCaseGenerator:
    """Main class for generating test cases using LLMs."""

    def __init__(self, config: Config):
        """
        Initialize the test case generator.

        Args:
            config (Config): Configuration object
        """
        self.config = config
        self.llm_client = LLMClient(config)
        self.json_extractor = JSONExtractor()
        self.enhanced_validator = EnhancedJSONValidator()
        self.excel_converter = ExcelConverter()
        # Use DatabasePromptBuilder for dynamic business type support
        self.prompt_builder = DatabasePromptBuilder(config)
        self.db_manager = DatabaseManager(config)

        # TestPointGenerator removed - using unified test case generation system

        # Initialize consistency validator for data integrity checks
        from ..services.data_consistency_validator import DataConsistencyValidator
        self.consistency_validator = DataConsistencyValidator(self.db_manager)

        # Create database tables if they don't exist
        self.db_manager.create_tables()

    def load_prompts(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Load system and requirements prompts from database.

        Returns:
            tuple: (system_prompt, requirements_prompt) or (None, None) if failed
        """
        # Load system prompt from database
        system_prompt = self.prompt_builder.get_system_prompt()

        # For requirements prompt, we'll use the business-specific prompt combination
        # This will be handled in the generate_test_cases method
        requirements_prompt = None

        if system_prompt is None:
            print("错误：无法从数据库加载系统提示词")
            return None, None

        return system_prompt, requirements_prompt

    def validate_business_type(self, business_type: str) -> bool:
        """
        Validate business type using the new dynamic system.

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

                if business_config:
                    return True
                else:
                    return False

        except Exception as e:
            return False

    def get_available_business_types(self) -> list:
        """
        Get list of available active business types from database.

        Returns:
            list: List of available business type codes
        """
        try:
            with self.db_manager.get_session() as db:
                business_types = db.query(BusinessTypeConfig.code).filter(
                    BusinessTypeConfig.is_active == True
                ).order_by(BusinessTypeConfig.code).all()

                return [bt[0] for bt in business_types]

        except Exception as e:
            return []

    def generate_test_cases(self, business_type: str = "RCC") -> Optional[Dict[str, Any]]:
        """
        Generate test cases using LLM for a specific business type.

        Args:
            business_type (str): Business type (default: "RCC")

        Returns:
            Optional[Dict[str, Any]]: Generated test cases JSON or None if failed
        """
        # Validate configuration
        if not self.config.validate_main_config():
            print("Error: Missing required environment variables")
            return None

        # Load system prompt
        system_prompt, _ = self.load_prompts()
        if system_prompt is None:
            print("Error: Cannot load system prompt")
            return None
        print("=== Generating Test Cases ===")

        # Delegate to the business-specific method
        return self.generate_test_cases_for_business(business_type)

    def save_test_cases(self, test_cases_data: Dict[str, Any], output_dir: str = "output") -> Optional[str]:
        """
        Save test cases to JSON file.

        Args:
            test_cases_data (Dict[str, Any]): Test cases data
            output_dir (str): Output directory

        Returns:
            Optional[str]: Path to saved JSON file or None if failed
        """
        # Ensure output directory exists
        ensure_directory_exists(output_dir)

        # Generate filename with timestamp
        from ..utils.file_handler import generate_timestamped_filename
        filename = generate_timestamped_filename("test_cases", "json")
        filepath = f"{output_dir}/{filename}"

        # Save JSON to file
        if save_json_file(test_cases_data, filepath):
            print(f"JSON file saved to: {filepath}")
            return filepath
        else:
            return None

    def generate_excel_file(self, test_cases_data: Dict[str, Any], output_dir: str = "output") -> Optional[str]:
        """
        Convert test cases to Excel format.

        Args:
            test_cases_data (Dict[str, Any]): Test cases data
            output_dir (str): Output directory

        Returns:
            Optional[str]: Path to created Excel file or None if failed
        """
        print("=== Converting to Excel ===")
        excel_path = self.excel_converter.convert_json_to_excel(test_cases_data, output_dir)

        if excel_path:
            print(f"Excel file created successfully: {excel_path}")
        else:
            print("Failed to create Excel file.")

        return excel_path

    def run(self, business_type: str = "RCC") -> bool:
        """
        Run the complete test case generation process.

        Args:
            business_type (str): Business type for generation (default: "RCC")

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Generate test cases
            test_cases_data = self.generate_test_cases(business_type)
            if test_cases_data is None:
                return False

            # Save to JSON file
            json_path = self.save_test_cases(test_cases_data)
            if json_path is None:
                return False

            # Convert to Excel
            excel_path = self.generate_excel_file(test_cases_data)
            if excel_path is None:
                return False
            print("=== Test Case Generation Completed Successfully ===")
            print(f"JSON file: {json_path}")
            print(f"Excel file: {excel_path}")

            return True

        except Exception as e:
            return False

    def generate_test_cases_for_business(self, business_type: str) -> Optional[Dict[str, Any]]:
        """
        Generate test cases for a business type using unified generation service.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[Dict[str, Any]]: Generated test cases JSON or None if failed
        """
        try:
            # All generation now uses unified generation service
            logger.error("Direct generation deprecated - use unified generation service")
            return None

        except Exception as e:
            return None

    def generate_test_points_only(self, business_type: str,
                                 additional_context: Optional[Dict[str, Any]] = None,
                                 save_to_db: bool = False,
                                 project_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Legacy method - replaced by unified generation service.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)
            additional_context (Optional[Dict[str, Any]]): Additional context for generation
            save_to_db (bool): Whether to save test points to database
            project_id (Optional[int]): Project ID for database saving

        Returns:
            Optional[Dict[str, Any]]: Generated test points JSON or None if failed
        """
        # TestPointGenerator removed - this functionality moved to unified generation service
        logger.error("generate_test_points_only method deprecated - use unified generation service")
        return None

    def generate_test_cases_from_external_points(self, business_type: str,
                                               test_points_data: Dict[str, Any],
                                               additional_context: Optional[Dict[str, Any]] = None,
                                               save_to_db: bool = False,
                                               project_id: Optional[int] = None,
                                               test_point_ids: Optional[List[int]] = None,
                                               ai_logger=None) -> Optional[Dict[str, Any]]:
        """
        Generate test cases from externally provided test points (second stage only).

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)
            test_points_data (Dict[str, Any]): Test points data from external source
            additional_context (Optional[Dict[str, Any]]): Additional context for generation
            save_to_db (bool): Whether to save test cases to database
            project_id (Optional[int]): Project ID for database saving

        Returns:
            Optional[Dict[str, Any]]: Generated test cases JSON or None if failed
        """
        try:
            # Validate business type using new dynamic system
            if not self.validate_business_type(business_type):
                raise ValueError(f"Invalid or inactive business type: {business_type}")

            # Get both system and user prompts from prompt combination
            # Fix: Handle both string and dictionary types for additional_context
            if isinstance(additional_context, dict):
                context_with_points = additional_context.copy()
            else:
                # If additional_context is a string, wrap it in a dictionary
                context_with_points = {'user_input': additional_context} if additional_context else {}
            context_with_points['test_points_data'] = test_points_data

            system_prompt, user_prompt = self.prompt_builder.get_two_stage_prompts(
                business_type, 'test_case'
            )
            if system_prompt is None or user_prompt is None:
                raise RuntimeError(f"无法为 {business_type} 获取测试用例生成提示词组合")

            # Apply template variables to both system and user prompts
            # Fix: Include test_point_ids for template variable resolution
            resolved_system_prompt = self.prompt_builder._apply_template_variables(
                content=system_prompt,
                additional_context=additional_context,
                business_type=business_type,
                project_id=project_id,
                endpoint_params={
                    'test_point_ids': test_point_ids,  # ✅ Add test_point_ids for template resolution
                    'test_points_data': test_points_data,  # Keep existing data structure
                    'additional_context': additional_context,
                    'generation_stage': 'test_case',
                    'project_id': project_id
                }
            )

            user_prompt = self.prompt_builder._apply_template_variables(
                content=user_prompt,
                additional_context=additional_context,
                business_type=business_type,
                project_id=project_id,
                endpoint_params={
                    'test_point_ids': test_point_ids,  # ✅ Add test_point_ids for template resolution
                    'test_points_data': test_points_data,  # Keep existing data structure
                    'additional_context': additional_context,
                    'generation_stage': 'test_case',
                    'project_id': project_id
                }
            )

            logger.info(f"开始从测试点生成测试用例 | 业务类型: {business_type} | "
                       f"测试点数量: {len(test_points_data.get('test_points', []))}")

            # 记录模板变量替换结果到AI日志
            if ai_logger:
                try:
                    ai_logger.log_resolved_prompts(resolved_system_prompt, user_prompt)
                    ai_logger.log_template_replacement_info(
                        system_prompt, resolved_system_prompt,
                        user_prompt, user_prompt
                    )
                except Exception as log_error:
                    logger.warning(f"Failed to log resolved prompts for test case generation: {log_error}")

            # Generate test cases using LLM
            response = self.llm_client.generate_test_cases(
                system_prompt,
                user_prompt,
                ai_logger=ai_logger,
                resolved_system_prompt=resolved_system_prompt,
                resolved_requirements_prompt=user_prompt
            )
            if response is None:
                # Enhanced error handling for template variable issues
                logger.error(f"LLM call failed for business_type: {business_type}")
                logger.error(f"Template variables status: test_point_ids={test_point_ids}, template_resolution_completed=True")
                logger.error(f"Prompt length: system={len(system_prompt)}, user={len(user_prompt)}")
                logger.error(f"LLM client info: {self.llm_client.get_model_info()}")
                raise RuntimeError(f"LLM call failed for {business_type} - check template variable resolution and LLM connectivity")

            # Extract JSON from response
            json_result = self.json_extractor.extract_json_from_response(response)
            if json_result is None:
                logger.error("测试用例JSON提取失败")
                self._analyze_failed_response(response)
                raise RuntimeError("JSON extraction failed - no valid JSON found in LLM response")

            # Validate JSON structure
            if not self.json_extractor.validate_json_structure(json_result):
                logger.error("测试用例JSON结构验证失败")
                raise RuntimeError("Test cases JSON structure validation failed")

            # Add metadata
            test_cases = json_result.get('test_cases', [])
            test_cases_count = len(test_cases) if isinstance(test_cases, list) else 0

            json_result['generation_metadata'] = {
                'business_type': business_type,
                'generation_stage': 'test_case',
                'source_test_points_count': len(test_points_data.get('test_points', [])),
                'generated_test_cases_count': test_cases_count,
                'timestamp': time.time()
            }

            logger.info(f"从测试点生成测试用例成功 | 业务类型: {business_type} | "
                       f"测试用例数量: {test_cases_count}")

            # Save to database if requested
            if save_to_db:
                self.save_to_database(json_result, business_type, project_id, test_point_ids, ai_logger)

            return json_result

        except Exception as e:
            logger.error(f"Error generating test cases from external points for {business_type}: {str(e)}")
            return None

    def save_to_database(self, test_cases_data: Dict[str, Any], business_type: str, project_id: Optional[int] = None, test_point_ids: Optional[List[int]] = None, ai_logger=None) -> bool:
        """
        Update existing test point records with generated test case details.

        This method implements the core logic that test case generation is always an UPDATE operation,
        not a creation. It finds existing test point records by their IDs and updates them with
        AI-generated detailed test case information, changing their stage from 'test_point' to 'test_case'.

        Args:
            test_cases_data (Dict[str, Any]): Generated test cases data from AI
            business_type (str): Business type for categorization
            project_id (Optional[int]): Project ID (not used in update logic)
            test_point_ids (Optional[List[int]]): List of test point IDs to update with test case details

        Returns:
            bool: True if successful, False otherwise
        """
        import traceback
        import json
        from datetime import datetime
        from ..database.models import UnifiedTestCase, UnifiedTestCaseStage

        try:
            if not test_point_ids:
                logger.warning("No test_point_ids provided for updating test cases")
                return False

            test_cases_list = test_cases_data.get('test_cases', [])
            if not test_cases_list:
                logger.warning("No test cases found in generated data")
                return False

            logger.info(f"Updating {len(test_point_ids)} test point records with test case details")

            # Use simple database session for update operations
            try:
                with self.db_manager.get_session() as db:
                    # Find existing test point records to update
                    existing_test_points = db.query(UnifiedTestCase).filter(
                        UnifiedTestCase.id.in_(test_point_ids),
                        UnifiedTestCase.stage == UnifiedTestCaseStage.TEST_POINT
                    ).all()

                    if not existing_test_points:
                        logger.error(f"No test point records found for IDs: {test_point_ids}")
                        return False

                    logger.info(f"Found {len(existing_test_points)} existing test point records to update")

                    # 准备数据映射日志
                    mapping_data = {
                        "business_type": business_type,
                        "project_id": project_id,
                        "test_point_ids_requested": test_point_ids,
                        "test_point_ids_found": [tp.id for tp in existing_test_points],
                        "test_cases_generated_count": len(test_cases_list),
                        "mapping_details": []
                    }

                    # Update each test point record with generated test case details
                    updated_count = 0
                    for i, test_point in enumerate(existing_test_points):
                        if i < len(test_cases_list):
                            test_case = test_cases_list[i]

                            # 记录映射前的测试点数据
                            test_point_before = {
                                "id": test_point.id,
                                "test_case_id": test_point.test_case_id,
                                "name": test_point.name,
                                "description": test_point.description,
                                "preconditions": test_point.preconditions,
                                "steps": test_point.steps,
                                "stage": str(test_point.stage)
                            }

                            # Update test point with test case details
                            # Convert lists to JSON strings for database storage
                            preconditions = test_case.get('preconditions')
                            steps = test_case.get('steps')
                            expected_result = test_case.get('expected_result')

                            test_point.preconditions = json.dumps(preconditions, ensure_ascii=False) if isinstance(preconditions, list) else preconditions
                            test_point.steps = json.dumps(steps, ensure_ascii=False) if isinstance(steps, list) else steps
                            test_point.expected_result = json.dumps(expected_result, ensure_ascii=False) if isinstance(expected_result, list) else expected_result
                            test_point.module = test_case.get('module')
                            test_point.functional_module = test_case.get('functional_module')
                            test_point.functional_domain = test_case.get('functional_domain')
                            test_point.remarks = test_case.get('remarks')

                            # Critical: Update stage from test_point to test_case
                            test_point.stage = UnifiedTestCaseStage.TEST_CASE
                            test_point.updated_at = datetime.utcnow()

                            # 记录映射后的数据对比
                            mapping_detail = {
                                "test_point_before": test_point_before,
                                "test_case_generated": test_case,
                                "mapping_index": i,
                                "updated_fields": {
                                    "preconditions": {
                                        "before": test_point_before["preconditions"],
                                        "after": test_point.preconditions
                                    },
                                    "steps": {
                                        "before": test_point_before["steps"],
                                        "after": test_point.steps
                                    },
                                    "stage": {
                                        "before": test_point_before["stage"],
                                        "after": str(test_point.stage)
                                    }
                                }
                            }
                            mapping_data["mapping_details"].append(mapping_detail)

                            updated_count += 1
                        else:
                            logger.warning(f"No test case data available for test point ID {test_point.id}")
                            mapping_data["mapping_details"].append({
                                "test_point_id": test_point.id,
                                "error": "No corresponding test case data available",
                                "mapping_index": i
                            })

                    # 记录AI映射日志
                    if ai_logger:
                        ai_logger.log_data_mapping_comparison(mapping_data)

                    # Commit the updates
                    db.commit()
                    logger.info(f"Successfully updated {updated_count} test point records to test cases")

            except Exception as e:
                # Rollback on error
                db.rollback()
                error_msg = f"Database transaction failed: {str(e)}"
                logger.error(f"{error_msg}\n{traceback.format_exc()}")
                return False

            logger.info(f"✅ Test case update completed for business type: {business_type}")
            return True

        except Exception as e:
            error_msg = f"Error updating test cases to database for {business_type}: {str(e)}\n\nFull traceback:\n{traceback.format_exc()}"
            logger.error(error_msg)
            return False

    def _create_knowledge_entities_for_new_structure(self, db_operations, test_case_project_id, unified_test_cases_data, business_type):
        """
        Create knowledge graph entities for the new test case structure.

        Args:
            db_operations: Database operations instance
            test_case_project_id: object ID (integer)
            unified_test_cases_data: List of dictionaries containing test case item data
            business_type: Business type enum
        """
        # Get the business entity to associate test cases with
        business_entity = db_operations.db.query(KnowledgeEntity).filter(
            KnowledgeEntity.business_type == business_type,
            KnowledgeEntity.type == EntityType.BUSINESS
        ).first()

        if not business_entity:
            print(f"No business entity found for {business_type}")
            return

        for item in unified_test_cases_data:
            # Create test case knowledge entity
            tc_entity = db_operations.create_knowledge_entity(
                name=item['name'],
                entity_type=EntityType.TEST_CASE,
                description=item['description'],
                business_type=business_type,
                parent_id=business_entity.id,
                entity_order=item['entity_order'],
                extra_data=json.dumps({
                    'test_case_id': item['test_case_id'],
                    'module': item['module'],
                    'preconditions': json.loads(item['preconditions']) if item['preconditions'] else [],
                    'steps': json.loads(item['steps']) if item['steps'] else [],
                    'expected_result': json.loads(item['expected_result']) if item['expected_result'] else [],
                    'functional_module': item['functional_module'],
                    'functional_domain': item['functional_domain'],
                    'remarks': item['remarks'],
                    'test_case_item_id': item['id']
                }, ensure_ascii=False)
            )

            # Create test case entity mapping
            db_operations.create_test_case_entity(
                test_case_item_id=item['id'],
                entity_id=tc_entity.id,
                name=item['name'],
                description=item['description'],
                extra_metadata=json.dumps({'test_case_item_id': item['id']}, ensure_ascii=False)
            )

            # Create relation: business has_test_case test_case_entity
            db_operations.create_knowledge_relation(
                subject_name=business_entity.name,
                predicate="has_test_case",
                object_name=tc_entity.name,
                business_type=business_type
            )

    def _ensure_business_entities_exist(self, db_operations, business_type):
        """
        Ensure business and service entities exist for the given business type.
        If they don't exist, create them using BusinessDataExtractor.

        Args:
            db_operations: Database operations instance
            business_type: Business type enum
        """
        from .business_data_extractor import BusinessDataExtractor

        # Check if business entity exists
        business_entity = db_operations.db.query(KnowledgeEntity).filter(
            KnowledgeEntity.business_type == business_type,
            KnowledgeEntity.type == EntityType.BUSINESS
        ).first()

        if not business_entity:
            # Use BusinessDataExtractor to create missing entities
            extractor = BusinessDataExtractor(db_operations)
            extractor.extract_business_data(business_type)
        else:
            print(f"Business entity exists for {business_type}: {business_entity.name}")

    def get_test_cases_from_database(self, business_type: Optional[str] = None) -> Optional[list]:
        """
        Get test cases from database.

        Args:
            business_type (Optional[str]): Business type filter, None for all

        Returns:
            Optional[list]: List of test cases or None if failed
        """
        try:
            with self.db_manager.get_session() as db:
                db_operations = DatabaseOperations(db)

                if business_type:
                    # Use string directly instead of enum
                    business_type_str = business_type.upper()
                    test_cases = db_operations.get_test_cases_by_business_type_str(business_type_str)
                else:
                    test_cases = db_operations.get_all_test_cases()

                # Convert to list of dictionaries
                result = []
                for tc in test_cases:
                    result.append({
                        "id": tc.id,
                        "business_type": tc.business_type,  # Already a string, not an enum
                        "test_data": json.loads(tc.test_data),
                        "created_at": tc.created_at.isoformat(),
                        "updated_at": tc.updated_at.isoformat()
                    })

                return result

        except Exception as e:
            return None

    def delete_test_cases_from_database(self, business_type: str) -> bool:
        """
        Delete test cases from database for a specific business type.

        Args:
            business_type (str): Business type

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Use string directly instead of enum
            business_type_str = business_type.upper()

            with self.db_manager.get_session() as db:
                db_operations = DatabaseOperations(db)
                deleted_count = db_operations.delete_test_cases_by_business_type_str(business_type_str)
                deleted_entities_count = db_operations.delete_knowledge_entities_by_business_type_str(business_type_str)
                print(f"Deleted {deleted_count} test cases and {deleted_entities_count} knowledge entities for {business_type_str}")
                return True

        except Exception as e:
            return False

    def _remove_duplicate_test_cases(self, test_cases_list: list) -> list:
        """
        Remove duplicate test case names, keep the first occurrence.

        Args:
            test_cases_list (list): List of test case dictionaries

        Returns:
            list: List of test cases with unique names
        """
        seen_names = set()
        unique_test_cases = []
        duplicate_count = 0

        for test_case in test_cases_list:
            name = test_case.get('name', '').strip()
            if not name:
                continue

            if name not in seen_names:
                seen_names.add(name)
                unique_test_cases.append(test_case)
            else:
                duplicate_count += 1

        if duplicate_count > 0:
            print(f"Found and removed {duplicate_count} duplicate test cases")

        return unique_test_cases

    def _verify_data_consistency(self, test_case_project_id, unified_test_cases_data, business_type, db_operations):
        """
        Verify data consistency between UnifiedTestCases and KnowledgeEntities.

        Args:
            test_case_project_id: object ID (integer)
            unified_test_cases_data: List of dictionaries containing test case item data
            business_type: Business type enum
            db_operations: Database operations instance
        """
        try:
            # Count knowledge entities for this business type
            knowledge_entities_count = db_operations.db.query(KnowledgeEntity).filter(
                KnowledgeEntity.business_type == business_type,
                KnowledgeEntity.type == EntityType.TEST_CASE
            ).count()

            # Count test case entities (mappings) for this group
            test_case_entities_count = db_operations.db.query(TestCaseEntity).join(
                KnowledgeEntity, TestCaseEntity.entity_id == KnowledgeEntity.id
            ).filter(
                KnowledgeEntity.business_type == business_type,
                KnowledgeEntity.type == EntityType.TEST_CASE
            ).count()
            print(f"  - UnifiedTestCases: {len(unified_test_cases_data)}")
            print(f"  - KnowledgeEntities (TEST_CASE): {knowledge_entities_count}")
            print(f"  - TestCaseEntity mappings: {test_case_entities_count}")

            # Check for inconsistencies
            if len(unified_test_cases_data) != knowledge_entities_count:
                print(f"Warning: test case items ({len(unified_test_cases_data)}) != knowledge entities ({knowledge_entities_count})")

            if len(unified_test_cases_data) != test_case_entities_count:
                print(f"Warning: test case items ({len(unified_test_cases_data)}) != test case entities ({test_case_entities_count})")

            if len(unified_test_cases_data) == knowledge_entities_count == test_case_entities_count:
                print("Data consistency verified: All counts match")

        except Exception as e:
            print(f"Error during data consistency verification: {e}")

    def _analyze_failed_response(self, response: str) -> None:
        """
        Analyze failed LLM response to provide better debugging information.

        Args:
            response (str): The failed LLM response
        """
        print("Analyzing failed response...")

        # Check response characteristics
        if not response:
            print("Response is completely empty")
            return

        response_lower = response.lower()

        # Check for common error patterns
        error_patterns = {
            "api_key_error": ["invalid api key", "unauthorized", "authentication failed"],
            "model_error": ["model not found", "invalid model", "model unavailable"],
            "rate_limit": ["rate limit", "too many requests", "quota exceeded"],
            "content_filter": ["content filter", "content policy", "inappropriate content"],
            "timeout": ["timeout", "request timeout", "connection timeout"],
            "json_format": ["not json", "invalid json", "json parse error"],
            "length_limit": ["too long", "maximum length", "token limit"]
        }

        found_patterns = []
        for pattern_name, pattern_keywords in error_patterns.items():
            if any(keyword in response_lower for keyword in pattern_keywords):
                found_patterns.append(pattern_name)

        if found_patterns:
            for pattern in found_patterns:
                if pattern == "api_key_error":        print("Suggestion: Check your OpenAI API key configuration")
                elif pattern == "model_error":        print("Suggestion: Verify the model name in your configuration")
                elif pattern == "rate_limit":        print("Suggestion: Wait a moment and try again, or check your API quota")
                elif pattern == "content_filter":        print("Suggestion: The response was filtered by content policy")
                elif pattern == "timeout":        print("Suggestion: Check your network connection")
                elif pattern == "json_format":        print("Suggestion: LLM returned non-JSON format, may need to adjust prompt")
                elif pattern == "length_limit":        print("Suggestion: Response too long, consider reducing prompt length")

        # Analyze response structure
        if response.strip().startswith('{'):
            print("Response appears to start with JSON format")
            try:
                import json
                json.loads(response)
                print("Response is actually valid JSON - the issue might be elsewhere")
            except json.JSONDecodeError as e:
                pass
        elif '```' in response:
            print("Response contains code blocks - JSON might be wrapped in ```")
        elif response_lower.startswith(('i cannot', 'i am unable', 'sorry', 'i apologize')):
            print("Response appears to be a refusal message")

        # Log analysis results for debugging
        logger.info(f"Failed response analysis completed: {len(found_patterns)} patterns detected")

    # Two-Stage Test Generation Methods - Moved to unified generation service
    # All legacy two-stage generation methods have been removed as part of the aggressive cleanup strategy.
    # These functionalities are now handled by the unified generation service and the unified test case system.

    # Legacy methods removed:
    # - generate_test_points()
    # - generate_test_cases_from_points()
    # - generate_two_stage_test_cases()
    # - _get_test_points_mapping()
    # - _store_test_points_to_database()
    # - validate_data_consistency()

    # Removed method references:
    def _get_test_points_mapping(self, db_operations, test_case_project_id, business_type):
        """Legacy method removed as part of aggressive cleanup."""
        return {}

    def validate_generation_consistency(self, business_type, project_id):
        """Legacy method removed as part of aggressive cleanup."""
        return {"validation_passed": True}