"""
Test JSON extraction functionality.
"""

import sys
import os
import json

# Add project root to path for testing
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from src.core.json_extractor import JSONExtractor


def test_extract_json_from_response():
    """Test JSON extraction from LLM response."""
    # Test with pure JSON
    pure_json = '{"test_cases": [{"id": "test-001", "name": "Test"}]}'
    result = JSONExtractor.extract_json_from_response(pure_json)
    assert result is not None
    assert "test_cases" in result
    print("Pure JSON extraction test passed")

    # Test with JSON in code block
    json_in_code = '''Here is the response:
```json
{"test_cases": [{"id": "test-002", "name": "Test 2"}]}
```
'''
    result = JSONExtractor.extract_json_from_response(json_in_code)
    assert result is not None
    assert "test_cases" in result
    print("JSON in code block extraction test passed")

    # Test with invalid JSON
    invalid_json = "This is not JSON"
    result = JSONExtractor.extract_json_from_response(invalid_json)
    assert result is None
    print("Invalid JSON handling test passed")


def test_validate_json_structure():
    """Test JSON structure validation."""
    valid_json = {"test_cases": []}
    assert JSONExtractor.validate_json_structure(valid_json) == True

    invalid_json = {"invalid_key": []}
    assert JSONExtractor.validate_json_structure(invalid_json) == False

    # Test with custom required key
    custom_json = {"custom_key": []}
    assert JSONExtractor.validate_json_structure(custom_json, "custom_key") == True

    print("JSON structure validation test passed")


def test_extract_test_cases_from_json():
    """Test test cases extraction."""
    json_data = {
        "test_cases": [
            {"id": "test-001", "name": "Test 1"},
            {"id": "test-002", "name": "Test 2"}
        ]
    }
    cases = JSONExtractor.extract_test_cases_from_json(json_data)
    assert len(cases) == 2
    assert cases[0]["id"] == "test-001"
    print("Test cases extraction test passed")


if __name__ == "__main__":
    test_extract_json_from_response()
    test_validate_json_structure()
    test_extract_test_cases_from_json()
    print("All JSON extractor tests passed!")