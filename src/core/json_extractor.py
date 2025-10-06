"""
JSON extraction utilities for processing LLM responses.
"""

import json
import re
from typing import Optional, Dict, Any


class JSONExtractor:
    """Utility class for extracting JSON from LLM responses."""

    @staticmethod
    def extract_json_from_response(response_text: str) -> Optional[Dict[str, Any]]:
        """
        Extract JSON from LLM response that may contain explanatory text.

        Args:
            response_text (str): Raw response text from LLM

        Returns:
            Optional[Dict[str, Any]]: Extracted JSON data or None if not found
        """
        # Try to parse the entire response as JSON first
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            pass

        # Look for JSON code block
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Look for any JSON object in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        # If no valid JSON found, return None
        return None

    @staticmethod
    def validate_json_structure(data: Dict[str, Any], required_key: str = "test_cases") -> bool:
        """
        Validate that the JSON data has the expected structure.

        Args:
            data (Dict[str, Any]): JSON data to validate
            required_key (str): Required key to check for

        Returns:
            bool: True if structure is valid, False otherwise
        """
        return isinstance(data, dict) and required_key in data

    @staticmethod
    def extract_test_cases_from_json(data: Dict[str, Any]) -> list:
        """
        Extract test cases list from JSON data.

        Args:
            data (Dict[str, Any]): JSON data containing test cases

        Returns:
            list: List of test cases
        """
        return data.get("test_cases", [])