"""
Core test case generation functionality.
"""

import json
from typing import Optional, Dict, Any

from ..llm.llm_client import LLMClient
from ..utils.config import Config
from ..utils.file_handler import load_text_file, save_json_file, ensure_directory_exists
from ..utils.prompt_builder import PromptBuilder
from ..utils.database_prompt_builder import DatabasePromptBuilder
from ..core.json_extractor import JSONExtractor
from ..core.excel_converter import ExcelConverter
from ..database.database import DatabaseManager
from ..database.operations import DatabaseOperations
from ..database.models import BusinessType, TestCaseGroup, TestCaseItem, KnowledgeEntity, KnowledgeRelation, TestCaseEntity, EntityType, BusinessTypeConfig


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
        self.excel_converter = ExcelConverter()
        # Use DatabasePromptBuilder for dynamic business type support
        self.prompt_builder = DatabasePromptBuilder(config)
        self.db_manager = DatabaseManager(config)

        # Create database tables if they don't exist
        self.db_manager.create_tables()

    def load_prompts(self) -> tuple[Optional[str], Optional[str]]:
        """
        Load system and requirements prompts from files.

        Returns:
            tuple: (system_prompt, requirements_prompt) or (None, None) if failed
        """
        system_prompt = load_text_file(self.config.system_prompt_path)
        requirements_prompt = load_text_file(self.config.requirements_prompt_path)

        if system_prompt is None or requirements_prompt is None:
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
                    print(f"[OK] Business type validated: {business_config.name} ({business_config.code})")
                    return True
                else:
                    print(f"[ERROR] Business type '{business_type}' not found or not active in database")
                    return False

        except Exception as e:
            print(f"[ERROR] Failed to validate business type '{business_type}': {str(e)}")
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
            print(f"[ERROR] Failed to get available business types: {str(e)}")
            return []

    def generate_test_cases(self) -> Optional[Dict[str, Any]]:
        """
        Generate test cases using LLM.

        Returns:
            Optional[Dict[str, Any]]: Generated test cases JSON or None if failed
        """
        # Validate configuration
        if not self.config.validate_main_config():
            print("Error: Missing required environment variables")
            return None

        # Load prompts
        system_prompt, requirements_prompt = self.load_prompts()
        if system_prompt is None or requirements_prompt is None:
            print("Error: Could not load prompt files")
            return None

        print("=== Generating Test Cases ===")

        # Generate test cases using LLM
        response = self.llm_client.generate_test_cases(system_prompt, requirements_prompt)
        if response is None:
            print("Error: Failed to get response from LLM")
            return None

        print("=== Processing LLM Response ===")

        # Extract JSON from response
        json_result = self.json_extractor.extract_json_from_response(response)
        if json_result is None:
            print("Could not extract JSON from response")
            print("Raw response:")
            print(response)
            return None

        # Validate JSON structure
        if not self.json_extractor.validate_json_structure(json_result):
            print("Invalid JSON structure: missing 'test_cases' key")
            return None

        # Pretty print the JSON result
        print("=== Extracted JSON ===")
        print(json.dumps(json_result, indent=2, ensure_ascii=False))

        return json_result

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
        print("\n=== Converting to Excel ===")
        excel_path = self.excel_converter.convert_json_to_excel(test_cases_data, output_dir)

        if excel_path:
            print(f"Excel file created successfully: {excel_path}")
        else:
            print("Failed to create Excel file.")

        return excel_path

    def run(self) -> bool:
        """
        Run the complete test case generation process.

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Generate test cases
            test_cases_data = self.generate_test_cases()
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

            print("\n=== Test Case Generation Completed Successfully ===")
            print(f"JSON file: {json_path}")
            print(f"Excel file: {excel_path}")

            return True

        except Exception as e:
            print(f"Error in test case generation process: {e}")
            return False

    def generate_test_cases_for_business(self, business_type: str) -> Optional[Dict[str, Any]]:
        """
        Generate test cases for a specific business type.

        Args:
            business_type (str): Business type (e.g., RCC, RFD, ZAB, ZBA)

        Returns:
            Optional[Dict[str, Any]]: Generated test cases JSON or None if failed

        Raises:
            Exception: Propagates specific error messages for better debugging
        """
        import time
        import traceback

        start_time = time.time()

        try:
            print(f"[START] Test case generation for {business_type}")

            # Validate business type using new dynamic system
            if not self.validate_business_type(business_type):
                raise ValueError(f"Invalid or inactive business type: {business_type}")

            # For backward compatibility, also try to get the enum (will be used in database operations)
            try:
                business_enum = BusinessType(business_type.upper())
                print(f"[OK] Business type enum validated: {business_enum.value}")
            except ValueError:
                # If enum doesn't exist, we'll handle it in database operations
                business_enum = None
                print(f"[INFO] Business type '{business_type}' exists in new system but not in legacy enum")

            # Build requirements prompt
            prompt_start = time.time()
            requirements_prompt = self.prompt_builder.build_prompt(business_type)
            if requirements_prompt is None:
                raise RuntimeError(f"Could not build requirements prompt for {business_type}")
            print(f"[PROMPT] Built | Time: {time.time() - prompt_start:.3f}s | Length: {len(requirements_prompt)}")

            # Load system prompt
            system_prompt = load_text_file(self.config.system_prompt_path)
            if system_prompt is None:
                raise RuntimeError("Could not load system prompt")
            print(f"[SYS] System prompt loaded | Length: {len(system_prompt)}")

            # Generate test cases using LLM
            llm_start = time.time()
            response = self.llm_client.generate_test_cases(system_prompt, requirements_prompt)
            if response is None:
                raise RuntimeError("Failed to get response from LLM")
            print(f"[LLM] Call completed | Time: {time.time() - llm_start:.2f}s")

            # Extract JSON from response
            json_start = time.time()
            json_result = self.json_extractor.extract_json_from_response(response)
            if json_result is None:
                print("[ERROR] JSON extraction failed")
                self._analyze_failed_response(response)
                raise RuntimeError("JSON extraction failed - no valid JSON found in LLM response")
            print(f"[JSON] Extracted | Time: {time.time() - json_start:.3f}s")

            # Validate JSON structure
            if not self.json_extractor.validate_json_structure(json_result):
                print("[ERROR] JSON structure validation failed")
                if isinstance(json_result, dict):
                    print(f"[INFO] Available keys: {list(json_result.keys())}")
                raise RuntimeError("JSON structure validation failed")

            # Report success
            test_cases = json_result.get('test_cases', [])
            test_cases_count = len(test_cases) if isinstance(test_cases, list) else 0
            total_time = time.time() - start_time

            print(f"[DONE] Generation completed for {business_type}")
            print(f"[RESULT] Generated {test_cases_count} test cases | Total time: {total_time:.2f}s")

            return json_result

        except Exception as e:
            total_time = time.time() - start_time
            error_msg = f"Error generating test cases for {business_type}: {str(e)}"
            print(f"[ERROR] Generation failed | Time: {total_time:.2f}s | Error: {str(e)[:100]}...")
            raise Exception(error_msg) from e

    def save_to_database(self, test_cases_data: Dict[str, Any], business_type: str, project_id: Optional[int] = None) -> bool:
        """
        Save test cases to database using new TestCaseGroup + TestCaseItem structure.

        This method has been optimized to split long transactions into multiple short
        transactions to prevent database blocking of other APIs.

        Args:
            test_cases_data (Dict[str, Any]): Test cases data
            business_type (str): Business type
            project_id (Optional[int]): Project ID

        Returns:
            bool: True if successful, False otherwise
        """
        import traceback

        try:
            print(f"[DB] Starting database save for {business_type}")

            # Validate business type
            try:
                business_enum = BusinessType(business_type.upper())
                print(f"[DB] Business type validated: {business_enum.value}")
            except ValueError as e:
                error_msg = f"Invalid business type '{business_type}' for database save: {str(e)}"
                print(f"[ERROR] {error_msg}")
                raise ValueError(error_msg)

            test_cases_list = test_cases_data.get('test_cases', [])
            print(f"[DB] Processing {len(test_cases_list)} test cases")

            # Remove duplicate test case names, keep the first occurrence
            try:
                original_count = len(test_cases_list)
                test_cases_list = self._remove_duplicate_test_cases(test_cases_list)
                dedup_count = len(test_cases_list)
                print(f"[DB] Deduplication: {original_count} -> {dedup_count} test cases")
            except Exception as e:
                error_msg = f"Error during deduplication: {str(e)}"
                print(f"[ERROR] {error_msg}")
                raise RuntimeError(error_msg) from e

            # Split operations into multiple short transactions to avoid blocking other APIs
            test_case_group = None
            test_case_items = []

            # Transaction 1: Delete existing data (short transaction)
            try:
                print(f"[DB] Transaction 1: Deleting existing data...")
                with self.db_manager.get_session() as db:
                    db_operations = DatabaseOperations(db)

                    # Delete existing test case groups and items
                    deleted_count = db_operations.delete_test_case_groups_by_business_type(business_enum)
                    print(f"[DB] Deleted {deleted_count} existing test case groups")

                    # Delete existing test case knowledge entities
                    deleted_entities_count = db_operations.db.query(KnowledgeEntity).filter(
                        KnowledgeEntity.business_type == business_enum,
                        KnowledgeEntity.type == EntityType.TEST_CASE
                    ).count()

                    db_operations.db.query(KnowledgeEntity).filter(
                        KnowledgeEntity.business_type == business_enum,
                        KnowledgeEntity.type == EntityType.TEST_CASE
                    ).delete()
                    db_operations.db.commit()
                    print(f"[DB] Deleted {deleted_entities_count} existing test case knowledge entities")

                print(f"[DB] Transaction 1 completed successfully")
            except Exception as e:
                error_msg = f"Error deleting existing data: {str(e)}"
                print(f"[ERROR] {error_msg}")
                raise RuntimeError(error_msg) from e

            # Transaction 2: Ensure business entities exist (short transaction)
            try:
                print(f"[DB] Transaction 2: Ensuring business entities exist...")
                with self.db_manager.get_session() as db:
                    db_operations = DatabaseOperations(db)
                    self._ensure_business_entities_exist(db_operations, business_enum)

                print(f"[DB] Transaction 2 completed successfully")
            except Exception as e:
                error_msg = f"Error ensuring business entities exist: {str(e)}"
                print(f"[ERROR] {error_msg}")
                raise RuntimeError(error_msg) from e

            # Transaction 3: Create test case group (short transaction)
            test_case_group_id = None
            try:
                print(f"[DB] Transaction 3: Creating test case group...")
                generation_metadata = {
                    'generated_at': test_cases_data.get('generated_at'),
                    'total_test_cases': len(test_cases_list),
                    'generator_version': '2.0'
                }

                with self.db_manager.get_session() as db:
                    db_operations = DatabaseOperations(db)
                    test_case_group = db_operations.create_test_case_group(
                        business_enum,
                        generation_metadata,
                        project_id
                    )
                    # Get ID inside the transaction before session closes
                    test_case_group_id = test_case_group.id

                print(f"[DB] Transaction 3 completed - Created group with ID: {test_case_group_id}")
            except Exception as e:
                error_msg = f"Error creating test case group: {str(e)}"
                print(f"[ERROR] {error_msg}")
                raise RuntimeError(error_msg) from e

            # Transaction 4: Create test case items (shorter transaction, batched if needed)
            try:
                print(f"[DB] Transaction 4: Creating test case items...")
                with self.db_manager.get_session() as db:
                    db_operations = DatabaseOperations(db)
                    test_case_items = db_operations.create_test_case_items_batch(
                        test_case_group_id,  # Use the captured ID
                        test_cases_list
                    )

                    # Capture all required TestCaseItem data before session closes
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

                print(f"[DB] Transaction 4 completed - Created {len(test_case_items)} test case items")
            except Exception as e:
                error_msg = f"Error creating test case items: {str(e)}"
                print(f"[ERROR] {error_msg}")
                print(f"[DEBUG] Test case items creation traceback:\n{traceback.format_exc()}")
                raise RuntimeError(error_msg) from e

            # Transaction 5: Create knowledge graph entities (shorter transaction)
            try:
                print(f"[DB] Transaction 5: Creating knowledge graph entities...")
                with self.db_manager.get_session() as db:
                    db_operations = DatabaseOperations(db)
                    self._create_knowledge_entities_for_new_structure(
                        db_operations,
                        test_case_group_id,  # Pass the ID instead of object
                        test_case_items_data,  # Pass captured data instead of detached objects
                        business_enum
                    )

                print(f"[DB] Transaction 5 completed - Knowledge graph entities created")
            except Exception as e:
                error_msg = f"Error creating knowledge graph entities: {str(e)}"
                print(f"[ERROR] {error_msg}")
                raise RuntimeError(error_msg) from e

            # Transaction 6: Final verification (short transaction, read-only)
            try:
                print(f"[DB] Transaction 6: Verifying data consistency...")
                with self.db_manager.get_session() as db:
                    db_operations = DatabaseOperations(db)
                    self._verify_data_consistency(test_case_group_id, test_case_items_data, business_enum, db_operations)

                print(f"[DB] Transaction 6 completed - Data consistency verified")
            except Exception as e:
                error_msg = f"Error during data consistency verification: {str(e)}"
                print(f"[WARNING] {error_msg}")
                # Don't fail the whole operation for consistency check failures

            print(f"[DB] All transactions completed successfully for {business_type}")
            return True

        except Exception as e:
            error_msg = f"Error saving test cases to database for {business_type}: {str(e)}\n\nFull traceback:\n{traceback.format_exc()}"
            print(f"[ERROR] Complete failure in save_to_database:\n{error_msg}")
            return False

    def _create_knowledge_entities_for_new_structure(self, db_operations, test_case_group_id, test_case_items_data, business_type):
        """
        Create knowledge graph entities for the new test case structure.

        Args:
            db_operations: Database operations instance
            test_case_group_id: TestCaseGroup ID (integer)
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

        print(f"Found business entity: {business_entity.name} (ID: {business_entity.id})")

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

        print(f"Created knowledge entities for {len(test_case_items_data)} test case items")

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
            print(f"Business entity not found for {business_type.value}, creating business entities...")
            # Use BusinessDataExtractor to create missing entities
            extractor = BusinessDataExtractor(db_operations)
            extractor.extract_business_data(business_type)
            print(f"Created business entities for {business_type.value}")
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
            print(f"Error retrieving test cases from database: {e}")
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
            print(f"Error deleting test cases from database: {e}")
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
                print(f"Removing duplicate test case: {name}")

        if duplicate_count > 0:
            print(f"Removed {duplicate_count} duplicate test case names. Kept {len(unique_test_cases)} unique test cases.")

        return unique_test_cases

    def _verify_data_consistency(self, test_case_group_id, test_case_items_data, business_type, db_operations):
        """
        Verify data consistency between TestCaseItems and KnowledgeEntities.

        Args:
            test_case_group_id: TestCaseGroup ID (integer)
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

            print(f"Data consistency check for {business_type.value}:")
            print(f"  - TestCaseItems: {len(test_case_items_data)}")
            print(f"  - KnowledgeEntities (TEST_CASE): {knowledge_entities_count}")
            print(f"  - TestCaseEntity mappings: {test_case_entities_count}")

            # Check for inconsistencies
            if len(test_case_items_data) != knowledge_entities_count:
                print(f"WARNING: TestCaseItems count ({len(test_case_items_data)}) != KnowledgeEntities count ({knowledge_entities_count})")

            if len(test_case_items_data) != test_case_entities_count:
                print(f"WARNING: TestCaseItems count ({len(test_case_items_data)}) != TestCaseEntity mappings count ({test_case_entities_count})")

            if len(test_case_items_data) == knowledge_entities_count == test_case_entities_count:
                print("✓ Data consistency verified: All counts match")

        except Exception as e:
            print(f"Error during data consistency verification: {e}")

    def _analyze_failed_response(self, response: str) -> None:
        """
        Analyze failed LLM response to provide better debugging information.

        Args:
            response (str): The failed LLM response
        """
        print("🔍 Analyzing failed response...")

        # Check response characteristics
        if not response:
            print("❌ Response is completely empty")
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
            print(f"🚨 Detected error patterns: {', '.join(found_patterns)}")
            for pattern in found_patterns:
                if pattern == "api_key_error":
                    print("💡 Suggestion: Check your OpenAI API key configuration")
                elif pattern == "model_error":
                    print("💡 Suggestion: Verify the model name in your configuration")
                elif pattern == "rate_limit":
                    print("💡 Suggestion: Wait a moment and try again, or check your API quota")
                elif pattern == "content_filter":
                    print("💡 Suggestion: The response was filtered by content policy")
                elif pattern == "timeout":
                    print("💡 Suggestion: Check your network connection")
                elif pattern == "json_format":
                    print("💡 Suggestion: LLM returned non-JSON format, may need to adjust prompt")
                elif pattern == "length_limit":
                    print("💡 Suggestion: Response too long, consider reducing prompt length")

        # Analyze response structure
        if response.strip().startswith('{'):
            print("📋 Response appears to start with JSON format")
            try:
                import json
                json.loads(response)
                print("✅ Response is actually valid JSON - the issue might be elsewhere")
            except json.JSONDecodeError as e:
                print(f"❌ Response starts with {{ but is not valid JSON: {e}")
        elif '```' in response:
            print("📋 Response contains code blocks - JSON might be wrapped in ```")
        elif response_lower.startswith(('i cannot', 'i am unable', 'sorry', 'i apologize')):
            print("📋 Response appears to be a refusal message")

        # Save detailed analysis
        try:
            import os
            import time
            os.makedirs("debug", exist_ok=True)
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            analysis_file = f"debug/failed_response_analysis_{timestamp}.txt"

            with open(analysis_file, 'w', encoding='utf-8') as f:
                f.write(f"Failed Response Analysis\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Response Length: {len(response)}\n")
                f.write(f"Detected Patterns: {found_patterns}\n")
                f.write("=" * 50 + "\n\n")
                f.write("Complete Response:\n")
                f.write(response)

            print(f"💾 Detailed analysis saved to: {analysis_file}")
        except Exception as e:
            print(f"⚠️  Could not save analysis: {e}")