"""
Core test case generation functionality.
"""

import json
from typing import Optional, Dict, Any

from ..api.llm_client import LLMClient
from ..utils.config import Config
from ..utils.file_handler import load_text_file, save_json_file, ensure_directory_exists
from ..core.json_extractor import JSONExtractor
from ..core.excel_converter import ExcelConverter


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