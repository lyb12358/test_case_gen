"""
JSON extraction utilities for processing LLM responses.
"""

import json
import os
import re
import time
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


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
        import time
        start_time = time.time()

        print(f"[JSON] Extraction Started | Length: {len(response_text)} chars")

        # Check if response is empty or only whitespace
        if not response_text or len(response_text.strip()) == 0:
            print("[ERROR] Empty response")
            return None

        # Try to parse the entire response as JSON first
        try:
            result = json.loads(response_text)
            extraction_time = time.time() - start_time
            print(f"[OK] Direct JSON parsing successful | Time: {extraction_time:.3f}s")
            return JSONExtractor._validate_result(result, extraction_time)

        except json.JSONDecodeError as e:
            print(f"[WARN] Direct parsing failed: {str(e)[:50]}...")

            # Attempt JSON repair before trying other methods
            repaired_json = JSONExtractor._attempt_json_repair(response_text, e)
            if repaired_json:
                try:
                    result = json.loads(repaired_json)
                    extraction_time = time.time() - start_time
                    print(f"[REPAIR] JSON repair successful | Time: {extraction_time:.3f}s")
                    return JSONExtractor._validate_result(result, extraction_time)
                except json.JSONDecodeError:
                    print("[REPAIR] Repaired JSON still invalid, trying fallback methods")

        # Fallback: Look for JSON code block
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            try:
                json_content = json_match.group(1)
                result = json.loads(json_content)
                extraction_time = time.time() - start_time
                print(f"[OK] Code block parsing successful | Time: {extraction_time:.3f}s")
                return JSONExtractor._validate_result(result, extraction_time)
            except json.JSONDecodeError:
                pass

        # Fallback: Look for any JSON object
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                json_content = json_match.group(0)
                result = json.loads(json_content)
                extraction_time = time.time() - start_time
                print(f"[OK] Object parsing successful | Time: {extraction_time:.3f}s")
                return JSONExtractor._validate_result(result, extraction_time)
            except json.JSONDecodeError:
                pass

        # All extraction attempts failed
        extraction_time = time.time() - start_time
        return None

    @staticmethod
    def _attempt_json_repair(response_text: str, original_error: json.JSONDecodeError) -> Optional[str]:
        """
        Attempt to repair common JSON formatting issues.

        Args:
            response_text (str): The malformed JSON response
            original_error (json.JSONDecodeError): The original parsing error

        Returns:
            Optional[str]: Repaired JSON string or None if repair failed
        """
        logger.info("[REPAIR] Attempting JSON repair...")

        try:
            # Common repair patterns
            repaired = response_text.strip()

            # Fix unterminated strings
            if "unterminated string" in str(original_error).lower():
                # Find incomplete string and attempt to close it
                lines = repaired.split('\n')
                for i, line in enumerate(lines):
                    if line.count('"') % 2 == 1:  # Odd number of quotes = unterminated
                        lines[i] = line + '"'  # Add closing quote
                        break
                repaired = '\n'.join(lines)

            # Fix missing closing braces/brackets
            if repaired.count('{') > repaired.count('}'):
                repaired += '}' * (repaired.count('{') - repaired.count('}'))
            if repaired.count('[') > repaired.count(']'):
                repaired += ']' * (repaired.count('[') - repaired.count(']'))

            # Remove trailing commas before closing braces/brackets
            repaired = re.sub(r',(\s*[}\]])', r'\1', repaired)

            # Validate the repair
            json.loads(repaired)
            logger.info("[REPAIR] JSON repair successful")
            return repaired

        except (json.JSONDecodeError, Exception) as e:
            print(f"[REPAIR] JSON repair failed: {str(e)[:50]}...")
            return None

    @staticmethod
    def _validate_result(result: Dict[str, Any], extraction_time: float) -> Dict[str, Any]:
        """
        Validate and report on the extracted JSON result.

        Args:
            result (Dict[str, Any]): The parsed JSON result
            extraction_time (float): Time taken for extraction

        Returns:
            Dict[str, Any]: The validated result
        """
        if not isinstance(result, dict):
            print(f"[WARN] Result is not a dictionary: {type(result)}")
            return None

        # Check for expected structure
        if 'test_cases' not in result:
            logger.info("[WARN] Missing 'test_cases' key")
            return result  # Still return for further processing

        test_cases = result.get('test_cases', [])
        if isinstance(test_cases, list):
            print(f"[RESULT] Found {len(test_cases)} test cases")
        else:
            print(f"[WARN] 'test_cases' is not a list: {type(test_cases)}")

        return result

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
        if not isinstance(data, dict):
            return False

        if required_key not in data:
            return False

        test_cases = data[required_key]
        return isinstance(test_cases, list)

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

  