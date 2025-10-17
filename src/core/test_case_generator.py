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
from ..database.models import BusinessType, TestCaseGroup, TestCaseItem, KnowledgeEntity, KnowledgeRelation, TestCaseEntity, EntityType


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

        Raises:
            Exception: Propagates specific error messages for better debugging
        """
        import traceback

        try:
            print(f"🚀 Starting test case generation for {business_type}")

            # Validate business type
            try:
                business_enum = BusinessType(business_type.upper())
                print(f"✅ Business type validated: {business_enum.value}")
            except ValueError as e:
                error_msg = f"Invalid business type '{business_type}'. Supported types: {[bt.value for bt in BusinessType]}"
                print(f"❌ Error: {error_msg}")
                print(f"📋 Full validation error: {str(e)}")
                raise ValueError(error_msg)

            print(f"=== Generating Test Cases for {business_enum.value} ===")

            # Build requirements prompt using PromptBuilder
            print(f"📝 Building requirements prompt for {business_type}...")
            try:
                requirements_prompt = self.prompt_builder.build_prompt(business_type)
                if requirements_prompt is None:
                    error_msg = f"Could not build requirements prompt for {business_type}"
                    print(f"❌ Error: {error_msg}")
                    raise RuntimeError(error_msg)
                print(f"✅ Requirements prompt built successfully (length: {len(requirements_prompt)} chars)")
            except Exception as e:
                error_msg = f"Error building requirements prompt for {business_type}: {str(e)}"
                print(f"❌ Error: {error_msg}")
                print(f"📋 Prompt builder traceback:\n{traceback.format_exc()}")
                raise RuntimeError(error_msg) from e

            # Load system prompt
            print(f"📄 Loading system prompt from: {self.config.system_prompt_path}")
            try:
                system_prompt = load_text_file(self.config.system_prompt_path)
                if system_prompt is None:
                    error_msg = "Could not load system prompt"
                    print(f"❌ Error: {error_msg}")
                    print(f"📁 System prompt path: {self.config.system_prompt_path}")
                    raise RuntimeError(error_msg)
                print(f"✅ System prompt loaded successfully (length: {len(system_prompt)} chars)")
            except Exception as e:
                error_msg = f"Error loading system prompt: {str(e)}"
                print(f"❌ Error: {error_msg}")
                print(f"📋 System prompt loading traceback:\n{traceback.format_exc()}")
                raise RuntimeError(error_msg) from e

            print(f"=== Starting LLM API Call for {business_enum.value} ===")

            # Generate test cases using LLM
            try:
                response = self.llm_client.generate_test_cases(system_prompt, requirements_prompt)
                if response is None:
                    error_msg = "Failed to get response from LLM"
                    print(f"❌ Error: {error_msg}")
                    print(f"🔗 LLM API configuration - Base URL: {self.config.api_base_url}, Model: {self.config.model}")
                    raise RuntimeError(error_msg)
                print(f"✅ LLM response received (length: {len(response)} chars)")
            except Exception as e:
                error_msg = f"LLM API call failed: {str(e)}"
                print(f"❌ Error: {error_msg}")
                print(f"📋 LLM API traceback:\n{traceback.format_exc()}")
                raise RuntimeError(error_msg) from e

            print("=== Processing LLM Response ===")

            # Extract JSON from response (optimized with enhanced logging)
            try:
                print("🔍 Starting JSON extraction from LLM response...")
                json_result = self.json_extractor.extract_json_from_response(response)

                if json_result is None:
                    error_msg = "JSON extraction failed - no valid JSON found in LLM response"
                    print(f"❌ {error_msg}")
                    print("📄 Raw response preview:")
                    print(response[:800])
                    if len(response) > 800:
                        print(f"... (and {len(response) - 800} more characters)")

                    # Enhanced error analysis
                    self._analyze_failed_response(response)
                    raise RuntimeError(error_msg)

                print(f"✅ JSON extraction successful")
            except RuntimeError:
                # Re-raise RuntimeError from JSON extraction
                raise
            except Exception as e:
                error_msg = f"Unexpected error during JSON extraction: {str(e)}"
                print(f"❌ {error_msg}")
                print(f"📋 Unexpected error traceback:\n{traceback.format_exc()}")
                raise RuntimeError(error_msg) from e

            # Validate JSON structure (enhanced with detailed feedback)
            try:
                print("🔍 Validating extracted JSON structure...")
                if not self.json_extractor.validate_json_structure(json_result):
                    error_msg = "JSON structure validation failed"
                    print(f"❌ {error_msg}")

                    # Detailed structure analysis
                    if isinstance(json_result, dict):
                        print(f"📋 Available keys in JSON: {list(json_result.keys())}")
                        if 'test_cases' not in json_result:
                            print("💡 Missing 'test_cases' key - LLM may not have followed the expected format")
                        else:
                            test_cases = json_result.get('test_cases')
                            print(f"📊 'test_cases' field type: {type(test_cases)}")
                    else:
                        print(f"📊 JSON root type: {type(json_result)} (expected dict)")

                    raise RuntimeError(error_msg)

                # Success details
                test_cases = json_result.get('test_cases', [])
                test_cases_count = len(test_cases) if isinstance(test_cases, list) else 0
                print(f"✅ JSON structure validated successfully")
                print(f"📊 Found {test_cases_count} test cases in the JSON response")

                if test_cases_count == 0:
                    print("⚠️  Warning: No test cases found in the response")
                    print("💡 This might indicate the LLM couldn't generate valid test cases")

            except RuntimeError:
                # Re-raise RuntimeError from validation
                raise
            except Exception as e:
                error_msg = f"Unexpected error during JSON validation: {str(e)}"
                print(f"❌ {error_msg}")
                print(f"📋 Unexpected validation error traceback:\n{traceback.format_exc()}")
                raise RuntimeError(error_msg) from e

            # Pretty print the JSON result (truncated for very large responses)
            print("=== Extracted JSON Preview ===")
            json_str = json.dumps(json_result, indent=2, ensure_ascii=False)
            if len(json_str) > 2000:
                print(json_str[:2000])
                print(f"... (JSON truncated, total length: {len(json_str)} characters)")
            else:
                print(json_str)

            print(f"🎉 Test case generation completed successfully for {business_type}")
            return json_result

        except Exception as e:
            # Re-raise the exception with full context and traceback
            error_msg = f"Error generating test cases for {business_type}: {str(e)}\n\nFull traceback:\n{traceback.format_exc()}"
            print(f"💥 Complete failure in generate_test_cases_for_business:\n{error_msg}")
            raise Exception(error_msg) from e

    def save_to_database(self, test_cases_data: Dict[str, Any], business_type: str) -> bool:
        """
        Save test cases to database using new TestCaseGroup + TestCaseItem structure.

        Args:
            test_cases_data (Dict[str, Any]): Test cases data
            business_type (str): Business type

        Returns:
            bool: True if successful, False otherwise
        """
        import traceback

        try:
            print(f"💾 Starting database save for {business_type}")

            # Validate business type
            try:
                business_enum = BusinessType(business_type.upper())
                print(f"✅ Business type validated for database: {business_enum.value}")
            except ValueError as e:
                error_msg = f"Invalid business type '{business_type}' for database save: {str(e)}"
                print(f"❌ Error: {error_msg}")
                raise ValueError(error_msg)

            test_cases_list = test_cases_data.get('test_cases', [])
            print(f"📊 Processing {len(test_cases_list)} test cases for database save")

            # Remove duplicate test case names, keep the first occurrence
            try:
                original_count = len(test_cases_list)
                test_cases_list = self._remove_duplicate_test_cases(test_cases_list)
                dedup_count = len(test_cases_list)
                print(f"🔄 Deduplication: {original_count} -> {dedup_count} test cases")
            except Exception as e:
                error_msg = f"Error during deduplication: {str(e)}"
                print(f"❌ Error: {error_msg}")
                raise RuntimeError(error_msg) from e

            print(f"🗄️ Opening database session...")
            with self.db_manager.get_session() as db:
                db_operations = DatabaseOperations(db)
                print(f"✅ Database session opened successfully")

                # Delete existing test case groups and items for this business type
                try:
                    print(f"🗑️ Deleting existing test case groups for {business_enum.value}...")
                    deleted_count = db_operations.delete_test_case_groups_by_business_type(business_enum)
                    print(f"✅ Deleted {deleted_count} existing test case groups for {business_enum.value}")
                except Exception as e:
                    error_msg = f"Error deleting existing test case groups: {str(e)}"
                    print(f"❌ Error: {error_msg}")
                    raise RuntimeError(error_msg) from e

                # Delete only test case entities (not business/service entities) to prevent UNIQUE constraint errors
                try:
                    print(f"🗑️ Deleting existing test case knowledge entities for {business_enum.value}...")
                    deleted_entities_count = db_operations.db.query(KnowledgeEntity).filter(
                        KnowledgeEntity.business_type == business_enum,
                        KnowledgeEntity.type == EntityType.TEST_CASE
                    ).count()

                    db_operations.db.query(KnowledgeEntity).filter(
                        KnowledgeEntity.business_type == business_enum,
                        KnowledgeEntity.type == EntityType.TEST_CASE
                    ).delete()

                    db_operations.db.commit()
                    print(f"✅ Deleted {deleted_entities_count} existing test case knowledge entities for {business_enum.value}")
                except Exception as e:
                    error_msg = f"Error deleting existing knowledge entities: {str(e)}"
                    print(f"❌ Error: {error_msg}")
                    raise RuntimeError(error_msg) from e

                # Ensure business entities exist before creating test case entities
                try:
                    print(f"🏢 Ensuring business entities exist for {business_enum.value}...")
                    self._ensure_business_entities_exist(db_operations, business_enum)
                    print(f"✅ Business entities verified/created")
                except Exception as e:
                    error_msg = f"Error ensuring business entities exist: {str(e)}"
                    print(f"❌ Error: {error_msg}")
                    raise RuntimeError(error_msg) from e

                # Create new test case group
                try:
                    print(f"📁 Creating new test case group for {business_enum.value}...")
                    generation_metadata = {
                        'generated_at': test_cases_data.get('generated_at'),
                        'total_test_cases': len(test_cases_list),
                        'generator_version': '2.0'
                    }

                    test_case_group = db_operations.create_test_case_group(
                        business_enum,
                        generation_metadata
                    )
                    print(f"✅ Created new test case group for {business_enum.value} with ID: {test_case_group.id}")
                except Exception as e:
                    error_msg = f"Error creating test case group: {str(e)}"
                    print(f"❌ Error: {error_msg}")
                    raise RuntimeError(error_msg) from e

                # Create test case items in batch
                try:
                    print(f"📝 Creating {len(test_cases_list)} test case items in batch...")
                    test_case_items = db_operations.create_test_case_items_batch(
                        test_case_group.id,
                        test_cases_list
                    )
                    print(f"✅ Created {len(test_case_items)} test case items for group {test_case_group.id}")
                except Exception as e:
                    error_msg = f"Error creating test case items: {str(e)}"
                    print(f"❌ Error: {error_msg}")
                    print(f"📋 Test case items creation traceback:\n{traceback.format_exc()}")
                    raise RuntimeError(error_msg) from e

                # Create knowledge graph entities for the new test case items
                try:
                    print(f"🕸️ Creating knowledge graph entities for {len(test_case_items)} test case items...")
                    self._create_knowledge_entities_for_new_structure(
                        db_operations,
                        test_case_group,
                        test_case_items,
                        business_enum
                    )
                    print(f"✅ Knowledge graph entities created successfully")
                except Exception as e:
                    error_msg = f"Error creating knowledge graph entities: {str(e)}"
                    print(f"❌ Error: {error_msg}")
                    raise RuntimeError(error_msg) from e

                # Verify data consistency
                try:
                    print(f"🔍 Verifying data consistency...")
                    self._verify_data_consistency(test_case_group, test_case_items, business_enum, db_operations)
                    print(f"✅ Data consistency verified")
                except Exception as e:
                    error_msg = f"Error during data consistency verification: {str(e)}"
                    print(f"⚠️ Warning: {error_msg}")
                    # Don't fail the whole operation for consistency check failures

            print(f"🎉 Database save completed successfully for {business_type}")
            return True

        except Exception as e:
            error_msg = f"Error saving test cases to database for {business_type}: {str(e)}\n\nFull traceback:\n{traceback.format_exc()}"
            print(f"💥 Complete failure in save_to_database:\n{error_msg}")
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
                test_case_item_id=item.id,
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

    def _verify_data_consistency(self, test_case_group, test_case_items, business_type, db_operations):
        """
        Verify data consistency between TestCaseItems and KnowledgeEntities.

        Args:
            test_case_group: TestCaseGroup instance
            test_case_items: List of TestCaseItem instances
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
            print(f"  - TestCaseItems: {len(test_case_items)}")
            print(f"  - KnowledgeEntities (TEST_CASE): {knowledge_entities_count}")
            print(f"  - TestCaseEntity mappings: {test_case_entities_count}")

            # Check for inconsistencies
            if len(test_case_items) != knowledge_entities_count:
                print(f"WARNING: TestCaseItems count ({len(test_case_items)}) != KnowledgeEntities count ({knowledge_entities_count})")

            if len(test_case_items) != test_case_entities_count:
                print(f"WARNING: TestCaseItems count ({len(test_case_items)}) != TestCaseEntity mappings count ({test_case_entities_count})")

            if len(test_case_items) == knowledge_entities_count == test_case_entities_count:
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