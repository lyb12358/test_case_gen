"""
Interface test script generation functionality.
"""

import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

from ..utils.config import Config
from ..utils.file_handler import load_json_file, ensure_directory_exists, generate_timestamped_filename
from ..models.test_case import TestCase, TestCaseCollection


class InterfaceTestGenerator:
    """Generator for creating interface test scripts from test cases."""

    def __init__(self, config: Config):
        """
        Initialize the interface test generator.

        Args:
            config (Config): Configuration object
        """
        self.config = config

    def load_test_cases(self, json_file_path: str) -> Optional[TestCaseCollection]:
        """
        Load test cases from JSON file.

        Args:
            json_file_path (str): Path to JSON file

        Returns:
            Optional[TestCaseCollection]: Collection of test cases or None if failed
        """
        # Load JSON data
        json_data = load_json_file(json_file_path)
        if json_data is None:
            return None

        # Convert to TestCase objects
        test_cases = []
        test_cases_data = json_data.get("test_cases", [])

        for case_data in test_cases_data:
            try:
                test_case = TestCase(**case_data)
                test_cases.append(test_case)
            except Exception as e:
                continue

        return TestCaseCollection(test_cases=test_cases)

    def generate_pytest_content(self, test_cases: List[TestCase]) -> str:
        """
        Generate pytest script content from test cases.

        Args:
            test_cases (List[TestCase]): List of test cases

        Returns:
            str: Generated pytest script content
        """
        # Script header
        content = '''#!/usr/bin/env python3
"""
Auto-generated interface test script
"""

import pytest
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get configuration from environment
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8080')
API_KEY = os.getenv('API_KEY', 'your-api-key')

# Test data
test_cases = [
'''

        # Add test cases
        for case in test_cases:
            content += f"    {{\n"
            content += f"        'id': '{case.id}',\n"
            content += f"        'name': '''{case.name}''',\n"
            content += f"        'module': '{case.module}',\n"

            # Add preconditions
            preconditions = case.preconditions
            if isinstance(preconditions, list):
                content += "        'preconditions': [\n"
                for precondition in preconditions:
                    content += f"            '''{precondition}''',\n"
                content += "        ],\n"
            else:
                content += f"        'preconditions': ['''{preconditions}'''],\n"

            # Add steps
            content += "        'steps': [\n"
            for step in case.steps:
                content += f"            '''{step}''',\n"
            content += "        ],\n"

            # Add expected results
            expected_results = case.expected_result
            if isinstance(expected_results, list):
                content += "        'expected_results': [\n"
                for result in expected_results:
                    content += f"            '''{result}''',\n"
                content += "        ],\n"
            else:
                content += f"        'expected_results': ['''{expected_results}'''],\n"

            # Add functional module and domain
            content += f"        'functional_module': '{case.functional_module}',\n"
            content += f"        'functional_domain': '{case.functional_domain}',\n"
            content += "    },\n"

        content += "]\n\n"

        # Add test functions
        content += """
@pytest.fixture(scope="session")
def api_client():
    '''Create API client session'''
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}'
    })
    return session


def extract_api_call_from_step(step):
    '''Extract API call information from test step'''
    import re
    # Look for JSON in step description
    json_match = re.search(r'\\{.*\\}', step)
    if json_match:
        try:
            api_data = json.loads(json_match.group(0))
            return api_data
        except json.JSONDecodeError:
            pass
    return None


def validate_api_response(response_data, expected_code=None):
    '''Validate API response'''
    if response_data is None:
        return False, "No response data"

    if expected_code:
        actual_code = response_data.get('code', '')
        if actual_code != expected_code:
            return False, f"Expected code {expected_code}, got {actual_code}"

    return True, "Response is valid"


@pytest.mark.parametrize("test_case", test_cases)
def test_interface_functionality(api_client, test_case):
    '''Test interface functionality based on generated test cases'''
    print(f"Running test case: {test_case['id']} - {test_case['name']}")

    # Extract service endpoint from remarks or use default
    endpoint = test_case.get('remarks', '/v1.0/remoteControl/control')
    if endpoint.startswith('/'):
        endpoint = endpoint[1:]  # Remove leading slash if present

    url = f"{API_BASE_URL}/{endpoint}"

    # Process each step in the test case
    steps = test_case.get('steps', [])
    expected_results = test_case.get('expected_results', [])

    api_call_made = False

    for i, step in enumerate(steps):
        # Extract API call information from step
        api_data = extract_api_call_from_step(step)

        if api_data and not api_call_made:
            # This is an API call step, make the actual API request
            print(f"Making API call: {url}")
            print(f"Request data: {api_data}")

            try:
                response = api_client.post(url, json=api_data)
                response_data = response.json() if response.content else None

                print(f"Response status: {response.status_code}")
                print(f"Response data: {response_data}")

                # Validate response based on expected result
                expected_result = expected_results[i] if i < len(expected_results) else ""

                # Check for specific error codes in expected results
                import re
                code_match = re.search(r'"code":\\s*"([\\d]+)"', expected_result)
                expected_code = code_match.group(1) if code_match else None

                is_valid, message = validate_api_response(response_data, expected_code)
                assert is_valid, f"API response validation failed: {message}"

                # For successful calls, check that we got a session ID
                if response.status_code == 200 and not expected_code:
                    assert response_data and 'data' in response_data and 'sessionId' in response_data['data'], \\
                        "Expected sessionId in response for successful API call"

                api_call_made = True

            except Exception as e:
                # For negative test cases (error conditions), we might expect exceptions
                if "参数不正确" in expected_result or "没有车辆使用权" in expected_result:
                    # This is an expected error case, so the exception might be OK
                    print(f"Expected error occurred: {e}")
                else:
                    raise e

        # For non-API steps, just print the step description
        elif not api_call_made:
            print(f"Step {i+1}: {step}")

    # If no API call was made, validate the test case structure
    if not api_call_made:
        assert test_case['id'], "Test case ID is required"
        assert test_case['name'], "Test case name is required"
        assert test_case['steps'], "Test case steps are required"
        assert test_case['expected_results'], "Test case expected results are required"

        # Validate that steps and expected results have the same length
        assert len(test_case['steps']) == len(test_case['expected_results']), \\
            "Steps and expected results must have the same length"

    print(f"Test case {test_case['id']} completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
"""

        return content

    def generate_pytest_script(self, test_cases_collection: TestCaseCollection,
                             output_dir: str = "interface_tests") -> Optional[str]:
        """
        Generate pytest scripts from test cases collection.

        Args:
            test_cases_collection (TestCaseCollection): Collection of test cases
            output_dir (str): Directory to save the test scripts

        Returns:
            Optional[str]: Path to the created test script or None if failed
        """
        try:
            # Create output directory if it doesn't exist
            ensure_directory_exists(output_dir)

            # Get test cases list
            test_cases = test_cases_collection.test_cases

            if not test_cases:
                print("No test cases found in collection")
                return None

            # Generate filename with functional module of the first test case
            functional_module = test_cases[0].functional_module or "interface_tests"
            filename = generate_timestamped_filename(f"test_{functional_module}", "py")
            filepath = os.path.join(output_dir, filename)

            # Generate pytest script content
            script_content = self.generate_pytest_content(test_cases)

            # Write to file
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(script_content)

            print(f"Pytest script saved to: {filepath}")
            return filepath

        except Exception as e:
            return None

    def run(self) -> bool:
        """
        Run the interface test generation process.

        Returns:
            bool: True if successful, False otherwise
        """
        # Validate configuration
        if not self.config.validate_interface_config():
            logger.error("Error: JSON_FILE_PATH not found in environment variables")
            return False

        json_file_path = self.config.json_file_path

        # Check if file exists
        if not os.path.exists(json_file_path):
            return False        logger.info(=== Generating Interface Test Scripts ===)

        # Load test cases
        test_cases_collection = self.load_test_cases(json_file_path)
        if test_cases_collection is None:
            return False

        # Generate pytest script
        script_path = self.generate_pytest_script(
            test_cases_collection,
            self.config.interface_tests_dir
        )

        if script_path:
            print(f"Interface test script created successfully: {script_path}")
            return True
        else:        logger.info(Failed to create interface test script.)
            return False