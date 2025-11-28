# -*- coding: utf-8 -*-
"""
Core test case generation functionality.
"""

import logging
import json
import time
from typing import Optional, Dict, Any, Tuple

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
from ..database.models import BusinessType, Project, UnifiedTestCase, KnowledgeEntity, KnowledgeRelation, TestCaseEntity, EntityType, BusinessTypeConfig, TestPoint


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

        # Initialize test point generator for two-stage generation
        from .test_point_generator import TestPointGenerator
        self.test_point_generator = TestPointGenerator(config)

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
        Generate test cases for a business type using unified two-stage generation.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[Dict[str, Any]]: Generated test cases JSON or None if failed
        """
        try:
            # All generation now uses two-stage mode
            return self.generate_test_cases_two_stage(business_type)

        except Exception as e:
            return None

    def generate_test_points_only(self, business_type: str,
                                 additional_context: Optional[Dict[str, Any]] = None,
                                 save_to_db: bool = False,
                                 project_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Generate only test points for a business type (first stage only).

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)
            additional_context (Optional[Dict[str, Any]]): Additional context for generation
            save_to_db (bool): Whether to save test points to database
            project_id (Optional[int]): Project ID for database saving

        Returns:
            Optional[Dict[str, Any]]: Generated test points JSON or None if failed
        """
        try:
            from .test_point_generator import TestPointGenerator

            # Use TestPointGenerator for dedicated test point generation
            test_point_generator = TestPointGenerator(self.config)

            # Generate test points
            test_points_data = test_point_generator.generate_test_points(business_type, additional_context)

            if test_points_data and save_to_db:
                # Save to database if requested
                project_id = test_point_generator.save_test_points_to_database(
                    test_points_data, business_type, project_id
                )
                test_points_data['database_project_id'] = project_id

            return test_points_data

        except Exception as e:
            return None

    def generate_test_cases_from_external_points(self, business_type: str,
                                               test_points_data: Dict[str, Any],
                                               additional_context: Optional[Dict[str, Any]] = None,
                                               save_to_db: bool = False,
                                               project_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
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
            context_with_points = additional_context.copy() if additional_context else {}
            context_with_points['test_points_data'] = test_points_data

            system_prompt, user_prompt = self.prompt_builder.get_two_stage_prompts(
                business_type, 'test_case'
            )
            if system_prompt is None or user_prompt is None:
                raise RuntimeError(f"无法为 {business_type} 获取测试用例生成提示词组合")

            # Apply template variables to user prompt
            user_prompt = self.prompt_builder._apply_template_variables(
                content=user_prompt,
                additional_context=context_with_points.get('additional_context'),
                business_type=business_type,
                project_id=context_with_points.get('project_id'),
                endpoint_params={
                    **context_with_points,
                    'generation_stage': 'test_case'  # Explicitly identify as test_case generation
                }
            )

            logger.info(f"开始从测试点生成测试用例 | 业务类型: {business_type} | "
                       f"测试点数量: {len(test_points_data.get('test_points', []))}")

            # Generate test cases using LLM
            response = self.llm_client.generate_test_cases(system_prompt, user_prompt)
            if response is None:
                raise RuntimeError("Failed to get response from LLM")

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
                self.save_to_database(json_result, business_type, project_id)

            return json_result

        except Exception as e:
            logger.error(f"Error generating test cases from external points for {business_type}: {str(e)}")
            return None

    def save_to_database(self, test_cases_data: Dict[str, Any], business_type: str, project_id: Optional[int] = None) -> bool:
        """
        Save test cases to database using new object + UnifiedTestCase structure.

        This method uses a single ACID transaction to ensure data integrity and consistency.
        All database operations (delete, create, verify) are performed atomically to prevent
        data loss or corruption. The transaction includes proper rollback handling on failures.

        Args:
            test_cases_data (Dict[str, Any]): Test cases data
            business_type (str): Business type
            project_id (Optional[int]): Project ID

        Returns:
            bool: True if successful, False otherwise
        """
        import traceback

        try:

            # Validate business type
            try:
                business_enum = BusinessType(business_type.upper())
            except ValueError as e:
                error_msg = f"Invalid business type '{business_type}' for database save: {str(e)}"
                raise ValueError(error_msg)

            test_cases_list = test_cases_data.get('test_cases', [])

            # Remove duplicate test case names, keep the first occurrence
            try:
                original_count = len(test_cases_list)
                test_cases_list = self._remove_duplicate_test_cases(test_cases_list)
                dedup_count = len(test_cases_list)
            except Exception as e:
                error_msg = f"Error during deduplication: {str(e)}"
                raise RuntimeError(error_msg) from e

            # Use a single transaction for data integrity, but implement batch processing for performance
            try:
                with self.db_manager.get_session() as db:
                    db_operations = DatabaseOperations(db)

                    # All operations in a single transaction to ensure data consistency
                    # Step 1: Delete existing data
                    deleted_count = db_operations.delete_projects_by_business_type(business_enum)

                    # Delete existing test case knowledge entities
                    db_operations.db.query(KnowledgeEntity).filter(
                        KnowledgeEntity.business_type == business_enum,
                        KnowledgeEntity.type == EntityType.TEST_CASE
                    ).delete()

                    # Step 2: Ensure business entities exist
                    self._ensure_business_entities_exist(db_operations, business_enum)

                    # Step 3: Create test case group
                    generation_metadata = {
                        'generated_at': test_cases_data.get('generated_at'),
                        'total_test_cases': len(test_cases_list),
                        'generator_version': '2.0'
                    }

                    # Include test points data if available
                    if 'test_points' in test_cases_data:
                        generation_metadata['test_points'] = test_cases_data['test_points']

                    project = db_operations.create_project(
                        business_enum,
                        generation_metadata,
                        project_id
                    )
                    test_case_project_id = project.id

                    # Step 4: Create test case items with batch processing for performance
                    db_operations = DatabaseOperations(db)

                    # For two-stage generation, try to create test point associations
                    if 'test_points' in generation_metadata:
                        # Get test points mapping from database
                        test_points_mapping = self._get_test_points_mapping(db_operations, test_case_project_id, business_type)

                        # Create test case items with test point associations
                        test_case_items = db_operations.create_test_case_items_from_test_points(
                            test_case_project_id,
                            test_cases_list,
                            test_points_mapping
                        )
                    else:
                        # Regular generation without test points
                        test_case_items = db_operations.create_test_case_items_batch(
                            test_case_project_id,  # Use the captured ID
                            test_cases_list
                        )

                    # Capture all required UnifiedTestCase data before session closes
                    test_case_items_data = []
                    for item in test_case_items:
                        item_data = {
                            'id': item.id,
                            'name': item.name,
                            'description': item.description,
                            'test_case_id': item.test_case_id,
                            'module': item.module,
                            'preconditions': item.preconditions,
                            'steps': item.steps,
                            'expected_result': item.expected_result,
                            'functional_module': item.functional_module,
                            'functional_domain': item.functional_domain,
                            'remarks': item.remarks,
                            'entity_order': item.entity_order
                        }
                        test_case_items_data.append(item_data)

                    # Step 5: Create knowledge graph entities (within the same transaction)
                    self._create_knowledge_entities_for_new_structure(
                        db_operations,
                        test_case_project_id,  # Pass the ID instead of object
                        test_case_items_data,  # Pass captured data instead of detached objects
                        business_enum
                    )

                    # Step 6: Final verification (within the same transaction, read-only operations)
                    self._verify_data_consistency(test_case_project_id, test_case_items_data, business_enum, db_operations)

                    # Commit all operations in a single transaction
                    db.commit()

            except Exception as e:
                # Rollback the transaction if any step fails
                db.rollback()
                error_msg = f"Database transaction failed: {str(e)}"
                logger.error(f"{error_msg}\n{traceback.format_exc()}")
                raise RuntimeError(error_msg) from e

            # Run enhanced consistency validation using our new validator
            try:
                consistency_result = self.validate_generation_consistency(business_type, project_id)
                if not consistency_result.get("validation_passed", True):
                    logger.warning(f"⚠️ Enhanced consistency validation found {consistency_result.get('total_issues', 0)} issues for {business_type}")
                    logger.warning(f"   Errors: {consistency_result.get('error_count', 0)}, Warnings: {consistency_result.get('warning_count', 0)}")
                    # Log first 3 issues for debugging
                    for issue in consistency_result.get("issues_summary", [])[:3]:
                        logger.warning(f"   - {issue['type']}: {issue['description']}")
                else:
                    logger.info(f"✅ Enhanced consistency validation passed for {business_type}")
            except Exception as validation_error:
                logger.error(f"❌ Enhanced consistency validation failed for {business_type}: {str(validation_error)}")

            return True

        except Exception as e:
            error_msg = f"Error saving test cases to database for {business_type}: {str(e)}\n\nFull traceback:\n{traceback.format_exc()}"
            return False

    def _create_knowledge_entities_for_new_structure(self, db_operations, test_case_project_id, test_case_items_data, business_type):
        """
        Create knowledge graph entities for the new test case structure.

        Args:
            db_operations: Database operations instance
            test_case_project_id: object ID (integer)
            test_case_items_data: List of dictionaries containing test case item data
            business_type: Business type enum
        """
        # Get the business entity to associate test cases with
        business_entity = db_operations.db.query(KnowledgeEntity).filter(
            KnowledgeEntity.business_type == business_type,
            KnowledgeEntity.type == EntityType.BUSINESS
        ).first()

        if not business_entity:
            print(f"No business entity found for {business_type.value}")
            return

        for item in test_case_items_data:
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
            print(f"Business entity exists for {business_type.value}: {business_entity.name}")

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
                    business_enum = BusinessType(business_type.upper())
                    test_cases = db_operations.get_test_cases_by_business_type(business_enum)
                else:
                    test_cases = db_operations.get_all_test_cases()

                # Convert to list of dictionaries
                result = []
                for tc in test_cases:
                    result.append({
                        "id": tc.id,
                        "business_type": tc.business_type.value,
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
            business_enum = BusinessType(business_type.upper())

            with self.db_manager.get_session() as db:
                db_operations = DatabaseOperations(db)
                deleted_count = db_operations.delete_test_cases_by_business_type(business_enum)
                deleted_entities_count = db_operations.delete_knowledge_entities_by_business_type(business_enum)
                print(f"Deleted {deleted_count} test cases and {deleted_entities_count} knowledge entities for {business_enum.value}")
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

    def _verify_data_consistency(self, test_case_project_id, test_case_items_data, business_type, db_operations):
        """
        Verify data consistency between UnifiedTestCases and KnowledgeEntities.

        Args:
            test_case_project_id: object ID (integer)
            test_case_items_data: List of dictionaries containing test case item data
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
            print(f"  - UnifiedTestCases: {len(test_case_items_data)}")
            print(f"  - KnowledgeEntities (TEST_CASE): {knowledge_entities_count}")
            print(f"  - TestCaseEntity mappings: {test_case_entities_count}")

            # Check for inconsistencies
            if len(test_case_items_data) != knowledge_entities_count:
                print(f"Warning: test case items ({len(test_case_items_data)}) != knowledge entities ({knowledge_entities_count})")

            if len(test_case_items_data) != test_case_entities_count:
                print(f"Warning: test case items ({len(test_case_items_data)}) != test case entities ({test_case_entities_count})")

            if len(test_case_items_data) == knowledge_entities_count == test_case_entities_count:
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

    # Two-Stage Test Generation Methods

    def generate_test_points(self, business_type: str) -> Optional[Dict[str, Any]]:
        """
        Generate test points for a specific business type (Stage 1).

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[Dict[str, Any]]: Generated test points JSON or None if failed
        """
        try:

            # Validate business type using new dynamic system
            if not self.validate_business_type(business_type):
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
                project_id=project_id,  # 从方法参数获取
                endpoint_params={
                    'additional_context': additional_context,
                    'generation_stage': 'test_point'  # This method is in a two-stage flow, currently generating test_points
                } if additional_context else {'generation_stage': 'test_point'}
            )
            print(f"[USER] 测试点生成用户提示词已构建 | 长度: {len(user_prompt)}")

            # Generate test points using LLM
            llm_start = time.time()
            response = self.llm_client.generate_test_cases(system_prompt, user_prompt)
            llm_time = time.time() - llm_start

            if response is None:
                raise RuntimeError("大模型返回空响应")
            # Extract and validate JSON using enhanced validator
            validation_result = self.enhanced_validator.validate_and_extract_json(
                response,
                expected_structure='test_points',
                strict_mode=False
            )

            if not validation_result.is_valid or validation_result.data is None:
                print("无法从响应中提取JSON格式测试点")
                self._log_enhanced_validation_errors(validation_result)
                print("原始响应:")
                return None

            json_result = validation_result.data

            # Log warnings and info if any
            if validation_result.has_issues():
                self._log_validation_issues(validation_result)

            # Pretty print the test points result)

            return json_result

        except Exception as e:
            import traceback
            traceback.print_exc()
            return None

    def generate_test_cases_from_points(self, business_type: str, test_points: Dict[str, Any], additional_context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Generate test cases from test points for a specific business type (Stage 2).

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)
            test_points (Dict[str, Any]): Test points from Stage 1

        Returns:
            Optional[Dict[str, Any]]: Generated test cases JSON or None if failed
        """
        try:

            # Get both system and user prompts from prompt combination
            system_prompt, user_prompt = self.prompt_builder.get_two_stage_prompts(
                business_type, 'test_case'
            )
            if system_prompt is None or user_prompt is None:
                raise RuntimeError(f"无法为 {business_type} 获取测试用例生成提示词组合")

            # Build context for template variable resolution
            context = {
                'test_points': json.dumps(test_points, indent=2, ensure_ascii=False),
                'test_points_count': len(test_points.get('test_points', []))
            }

            # Merge with provided additional_context
            if additional_context:
                context.update(additional_context)

            # Apply template variables to user prompt
            user_prompt = self.prompt_builder._apply_template_variables(
                content=user_prompt,
                additional_context=context,
                business_type=business_type,
                project_id=project_id,  # 从方法参数获取
                endpoint_params={
                    **context,
                    'generation_stage': 'test_case'  # This method generates test cases
                }
            )
            print(f"[USER] 测试用例生成用户提示词已构建 | 长度: {len(user_prompt)}")

            # Generate test cases using LLM
            llm_start = time.time()
            response = self.llm_client.generate_test_cases(system_prompt, user_prompt)
            llm_time = time.time() - llm_start

            if response is None:
                raise RuntimeError("大模型返回空响应")
            # Extract JSON from response
            json_result = self.json_extractor.extract_json_from_response(response)
            if json_result is None:
                print("无法从响应中提取JSON格式测试用例")
                print("原始响应:")
                return None

            # Validate JSON structure for test cases
            if 'test_cases' not in json_result:
                print("JSON格式无效：缺少'test_cases'字段")
                return None

            # Pretty print the test cases result)

            return json_result

        except Exception as e:
            import traceback
            traceback.print_exc()
            return None

    def generate_test_cases_two_stage(self, business_type: str) -> Optional[Dict[str, Any]]:
        """
        Generate test cases using two-stage approach for a specific business type.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[Dict[str, Any]]: Generated test cases JSON or None if failed
        """
        import time

        start_time = time.time()

        try:
            # Get default project ID
            from ..database.models import Project
            with self.db_manager.get_session() as db:
                project = db.query(Project).filter(Project.name == '远控场景').first()
                if not project:
                    raise RuntimeError("Default project '远控场景' not found")
                project_id = project.id

            # Stage 1: Generate and store test points
            print(f"\n=== 阶段 1: 测试点生成和存储 ===")
            stage1_start = time.time()
            test_points = self.generate_test_points(business_type)
            stage1_time = time.time() - stage1_start

            if test_points is None:
                return None

            # Store test points to database for test case association
            test_points_project_id = self._store_test_points_to_database(business_type, test_points, project_id)

            # Stage 2: Generate test cases from test points
            print(f"\n=== 阶段 2: 测试用例生成 ===")
            stage2_start = time.time()
            test_cases = self.generate_test_cases_from_points(business_type, test_points)
            stage2_time = time.time() - stage2_start

            if test_cases is None:
                return None

            total_time = time.time() - start_time
            print(f"\n[TWO-STAGE] 两阶段测试生成完成 | 总耗时: {total_time:.3f}s")

            # Combine test points and test cases for complete result
            complete_result = {
                'business_type': business_type,
                'generation_time': {
                    'total': total_time,
                    'stage_1': stage1_time,
                    'stage_2': stage2_time
                },
                'test_points': test_points,
                'test_cases': test_cases
            }

            return complete_result

        except Exception as e:
            total_time = time.time() - start_time
            import traceback
            traceback.print_exc()
            return None

    def _get_test_points_mapping(self, db_operations: DatabaseOperations, test_case_project_id: int, business_type: str) -> Dict[str, int]:
        """
        Get mapping of test point names/IDs to database test_point_id for associating test cases.

        Args:
            db_operations (DatabaseOperations): Database operations instance
            test_case_project_id (int): Test case group ID
            business_type (str): Business type

        Returns:
            Dict[str, int]: Mapping from test point titles/IDs to database test_point_id
        """
        test_points_mapping = {}

        try:
            # Query test points for the same business type
            from sqlalchemy import text
            result = db_operations.db.execute(text("""
                SELECT tp.id, tp.test_point_id, tp.title, tp.description
                FROM test_points tp
                JOIN projects tcg ON tp.project_id = tcg.id
                WHERE tcg.business_type = :business_type
                ORDER BY tp.test_point_id
            """), {
                'business_type': business_type
            })

            test_points = result.fetchall()

            # Create mapping from various identifiers to test_point_id
            for tp in test_points:
                # Map by title (primary)
                test_points_mapping[tp.title] = tp.id

                # Map by test_point_id (e.g., TP001)
                test_points_mapping[tp.test_point_id] = tp.id

                # Map by description if available
                if tp.description:
                    test_points_mapping[tp.description] = tp.id

                # Also map by variations (partial matches)
                title_lower = tp.title.lower()
                test_points_mapping[title_lower] = tp.id

                # Map by key parts of the title
                if '功能' in tp.title:
                    key_part = tp.title.split('功能')[0].strip()
                    if key_part:
                        test_points_mapping[key_part] = tp.id

            print(f"[MAPPING] Created test points mapping with {len(test_points_mapping)} entries for {business_type}")
            for key, value in list(test_points_mapping.items())[:5]:  # Show first 5 for debugging
                print(f"  {key} -> {value}")

            return test_points_mapping

        except Exception as e:
            print(f"[ERROR] Failed to get test points mapping: {str(e)}")
            return {}

    def _store_test_points_to_database(self, business_type: str, test_points: Dict[str, Any], project_id: int) -> int:
        """
        Store generated test points to database for later test case association.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)
            test_points (Dict[str, Any]): Generated test points JSON
            project_id (int): Project ID

        Returns:
            int: Test case group ID containing the test points
        """
        try:
            with self.db_manager.get_session() as db:
                db_operations = DatabaseOperations(db)

                # Create test case group for test points
                business_enum = BusinessType[business_type.upper()]
                generation_metadata = {
                    'model': 'gpt-4',
                    'timestamp': time.time()
                }

                test_points_group = db_operations.create_project(
                    business_enum,
                    generation_metadata,
                    project_id
                )

                # Store test points
                test_points_list = test_points.get('test_points', [])
                stored_count = 0

                for tp_data in test_points_list:
                    try:
                        # Create test point record
                        test_point = TestPoint(
                            project_id=test_points_group.id,
                            business_type=business_enum,
                            test_point_id=tp_data.get('test_point_id', ''),
                            title=tp_data.get('title', ''),
                            description=tp_data.get('description', ''),
                            priority=tp_data.get('priority', 'medium'),
                            status="draft"  # Will be updated to APPROVED when test cases are generated
                        )
                        db.add(test_point)
                        stored_count += 1

                    except Exception as e:
                        print(f"[ERROR] Failed to store test point {tp_data.get('test_point_id', 'unknown')}: {str(e)}")
                        continue

                db.commit()
                print(f"[STORAGE] Successfully stored {stored_count} test points to database")
                return test_points_group.id

        except Exception as e:
            print(f"[ERROR] Failed to store test points to database: {str(e)}")
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Failed to store test points: {str(e)}")

    def validate_generation_consistency(self, business_type: str, project_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Validate data consistency after test generation.

        Args:
            business_type (str): Business type that was generated
            project_id (Optional[int]): Project ID that was used

        Returns:
            Dict[str, Any]: Consistency validation results
        """
        try:
            logger.info(f"Running consistency validation after generation - business_type: {business_type}, project_id: {project_id}")

            # Run comprehensive consistency check
            report = self.consistency_validator.validate_two_stage_generation_integrity(
                business_type=business_type,
                project_id=project_id
            )

            # Log results
            if report.is_consistent:
                logger.info(f"✅ Consistency validation passed - No issues found for {business_type}")
            else:
                logger.warning(f"⚠️ Consistency validation found {report.total_issues} issues for {business_type}")
                logger.warning(f"   Errors: {report.error_count}, Warnings: {report.warning_count}")

            # Log specific issues for debugging
            for issue in report.issues[:5]:  # Log first 5 issues
                logger.warning(f"   - {issue.type.value}: {issue.description}")

            # Return summary for API response
            return {
                "validation_passed": report.is_consistent,
                "total_issues": report.total_issues,
                "error_count": report.error_count,
                "warning_count": report.warning_count,
                "validation_timestamp": report.validation_timestamp,
                "issues_summary": [
                    {
                        "type": issue.type.value,
                        "severity": issue.severity.value,
                        "description": issue.description,
                        "entity_type": issue.entity_type,
                        "entity_id": issue.entity_id
                    }
                    for issue in report.issues
                ],
                "statistics": report.statistics
            }

        except Exception as e:
            logger.error(f"Error during consistency validation: {str(e)}")
            return {
                "validation_passed": False,
                "error": str(e),
                "validation_timestamp": None,
                "issues_summary": []
            }

    