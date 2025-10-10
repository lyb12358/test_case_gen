"""
Core test case generation functionality.
"""

import json
from typing import Optional, Dict, Any

from ..llm.llm_client import LLMClient
from ..utils.config import Config
from ..utils.file_handler import load_text_file, save_json_file, ensure_directory_exists
from ..utils.prompt_builder import PromptBuilder
from ..core.json_extractor import JSONExtractor
from ..core.excel_converter import ExcelConverter
from ..database.database import DatabaseManager
from ..database.operations import DatabaseOperations
from ..database.models import BusinessType, TestCaseGroup, TestCaseItem, KnowledgeEntity, KnowledgeRelation, EntityType


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
        self.prompt_builder = PromptBuilder(config)
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
        """
        try:
            # Validate business type
            try:
                business_enum = BusinessType(business_type.upper())
            except ValueError:
                print(f"Error: Invalid business type '{business_type}'. Supported types: {[bt.value for bt in BusinessType]}")
                return None

            print(f"=== Generating Test Cases for {business_enum.value} ===")

            # Build requirements prompt using PromptBuilder
            requirements_prompt = self.prompt_builder.build_prompt(business_type)
            if requirements_prompt is None:
                print(f"Error: Could not build requirements prompt for {business_type}")
                return None

            # Load system prompt
            system_prompt = load_text_file(self.config.system_prompt_path)
            if system_prompt is None:
                print("Error: Could not load system prompt")
                return None

            print(f"=== Prompt Built for {business_enum.value} ===")

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

        except Exception as e:
            print(f"Error generating test cases for {business_type}: {e}")
            return None

    def save_to_database(self, test_cases_data: Dict[str, Any], business_type: str) -> bool:
        """
        Save test cases to database using new TestCaseGroup + TestCaseItem structure.

        Args:
            test_cases_data (Dict[str, Any]): Test cases data
            business_type (str): Business type

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Validate business type
            business_enum = BusinessType(business_type.upper())
            test_cases_list = test_cases_data.get('test_cases', [])

            # Remove duplicate test case names, keep the first occurrence
            test_cases_list = self._remove_duplicate_test_cases(test_cases_list)

            with self.db_manager.get_session() as db:
                db_operations = DatabaseOperations(db)

                # Delete existing test case groups and items for this business type
                deleted_count = db_operations.delete_test_case_groups_by_business_type(business_enum)
                print(f"Deleted {deleted_count} existing test case groups for {business_enum.value}")

                # Delete only test case entities (not business/service entities) to prevent UNIQUE constraint errors
                deleted_entities_count = db_operations.db.query(KnowledgeEntity).filter(
                    KnowledgeEntity.business_type == business_enum,
                    KnowledgeEntity.type == EntityType.TEST_CASE
                ).count()

                db_operations.db.query(KnowledgeEntity).filter(
                    KnowledgeEntity.business_type == business_enum,
                    KnowledgeEntity.type == EntityType.TEST_CASE
                ).delete()

                db_operations.db.commit()
                print(f"Deleted {deleted_entities_count} existing test case knowledge entities for {business_enum.value}")

                # Ensure business entities exist before creating test case entities
                self._ensure_business_entities_exist(db_operations, business_enum)

                # Create new test case group
                generation_metadata = {
                    'generated_at': test_cases_data.get('generated_at'),
                    'total_test_cases': len(test_cases_list),
                    'generator_version': '2.0'
                }

                test_case_group = db_operations.create_test_case_group(
                    business_enum,
                    generation_metadata
                )
                print(f"Created new test case group for {business_enum.value} with ID: {test_case_group.id}")

                # Create test case items in batch
                test_case_items = db_operations.create_test_case_items_batch(
                    test_case_group.id,
                    test_cases_list
                )
                print(f"Created {len(test_case_items)} test case items for group {test_case_group.id}")

                # Create knowledge graph entities for the new test case items
                self._create_knowledge_entities_for_new_structure(
                    db_operations,
                    test_case_group,
                    test_case_items,
                    business_enum
                )

                return True

        except Exception as e:
            print(f"Error saving test cases to database: {e}")
            return False

    def _create_knowledge_entities_for_new_structure(self, db_operations, test_case_group, test_case_items, business_type):
        """
        Create knowledge graph entities for the new test case structure.

        Args:
            db_operations: Database operations instance
            test_case_group: TestCaseGroup instance
            test_case_items: List of TestCaseItem instances
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

        for item in test_case_items:
            # Create test case knowledge entity
            tc_entity = db_operations.create_knowledge_entity(
                name=item.name,
                entity_type=EntityType.TEST_CASE,
                description=item.description,
                business_type=business_type,
                parent_id=business_entity.id,
                entity_order=item.entity_order,
                extra_data=json.dumps({
                    'test_case_id': item.test_case_id,
                    'module': item.module,
                    'preconditions': json.loads(item.preconditions) if item.preconditions else [],
                    'steps': json.loads(item.steps) if item.steps else [],
                    'expected_result': json.loads(item.expected_result) if item.expected_result else [],
                    'functional_module': item.functional_module,
                    'functional_domain': item.functional_domain,
                    'remarks': item.remarks,
                    'test_case_item_id': item.id
                }, ensure_ascii=False)
            )

            # Create test case entity mapping
            db_operations.create_test_case_entity(
                test_case_id=None,  # Legacy field not used
                entity_id=tc_entity.id,
                name=item.name,
                description=item.description,
                extra_metadata=json.dumps({'test_case_item_id': item.id}, ensure_ascii=False)
            )

            # Create relation: business has_test_case test_case_entity
            db_operations.create_knowledge_relation(
                subject_name=business_entity.name,
                predicate="has_test_case",
                object_name=tc_entity.name,
                business_type=business_type
            )

        print(f"Created knowledge entities for {len(test_case_items)} test case items")

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