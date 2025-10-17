"""
JSON extraction utilities for processing LLM responses.
"""

import json
import os
import re
import time
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
        print(f"🔍 JSON Extraction Started")
        print(f"📏 Response length: {len(response_text)} characters")
        print(f"📄 Response lines: {len(response_text.splitlines())}")

        # Check if response is empty or only whitespace
        if not response_text or len(response_text.strip()) == 0:
            print("❌ Response is empty or contains only whitespace")
            JSONExtractor._save_debug_response(response_text, "empty_response")
            return None

        # Try to parse the entire response as JSON first (optimized for pure JSON responses)
        try:
            print("🚀 Attempting direct JSON parsing (optimized for pure JSON responses)...")
            result = json.loads(response_text)

            # Validate the parsed JSON structure
            if isinstance(result, dict):
                print(f"✅ JSON parsed successfully!")
                print(f"📋 Top-level keys: {list(result.keys())}")

                # Check for expected structure
                if 'test_cases' in result:
                    test_cases = result.get('test_cases', [])
                    if isinstance(test_cases, list):
                        print(f"📊 Found {len(test_cases)} test cases in JSON")
                    else:
                        print(f"⚠️  'test_cases' field exists but is not a list: {type(test_cases)}")
                else:
                    print(f"⚠️  Missing 'test_cases' key in JSON response")

                return result
            else:
                print(f"⚠️  JSON parsed but is not a dictionary: {type(result)}")
                return None

        except json.JSONDecodeError as e:
            print(f"❌ Direct JSON parsing failed: {e}")
            print(f"📍 Error at line {e.lineno}, column {e.colno}")
            print(f"🔍 Error context: {e.msg[:100]}...")

            # Save the failed response for debugging
            JSONExtractor._save_debug_response(response_text, f"json_decode_error_{str(e).replace(' ', '_')[:50]}")

        # Fallback: Look for JSON code block (for backward compatibility)
        print("🔄 Fallback: Looking for JSON code block...")
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            try:
                print("📦 Found JSON code block, attempting to parse...")
                json_content = json_match.group(1)
                result = json.loads(json_content)
                print(f"✅ JSON code block parsed successfully! Keys: {list(result.keys())}")
                return result
            except json.JSONDecodeError as e:
                print(f"❌ JSON code block parsing failed: {e}")
                JSONExtractor._save_debug_response(json_content, f"code_block_error_{str(e).replace(' ', '_')[:50]}")

        # Fallback: Look for any JSON object in the response
        print("🔄 Fallback: Looking for any JSON object...")
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                print("📦 Found JSON object, attempting to parse...")
                json_content = json_match.group(0)
                result = json.loads(json_content)
                print(f"✅ JSON object parsed successfully! Keys: {list(result.keys())}")
                return result
            except json.JSONDecodeError as e:
                print(f"❌ JSON object parsing failed: {e}")
                JSONExtractor._save_debug_response(json_content, f"json_object_error_{str(e).replace(' ', '_')[:50]}")

        # If no valid JSON found, return None
        print("💥 All JSON extraction attempts failed")
        print("📄 Raw response preview (first 500 chars):")
        print(response_text[:500])
        if len(response_text) > 500:
            print(f"... (and {len(response_text) - 500} more characters)")

        # Save the complete response for debugging
        JSONExtractor._save_debug_response(response_text, "extraction_failed")
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
        if not isinstance(data, dict):
            print(f"❌ JSON validation failed: Expected dict, got {type(data)}")
            return False

        if required_key not in data:
            print(f"❌ JSON validation failed: Missing required key '{required_key}'")
            print(f"📋 Available keys: {list(data.keys())}")
            return False

        test_cases = data[required_key]
        if not isinstance(test_cases, list):
            print(f"❌ JSON validation failed: '{required_key}' should be a list, got {type(test_cases)}")
            return False

        print(f"✅ JSON structure validation passed: {len(test_cases)} test cases found")
        return True

    @staticmethod
    def extract_test_cases_from_json(data: Dict[str, Any]) -> list:
        """
        Extract test cases list from JSON data.

        Args:
            data (Dict[str, Any]): JSON data containing test cases

        Returns:
            list: List of test cases
        """
        test_cases = data.get("test_cases", [])
        print(f"📊 Extracted {len(test_cases)} test cases from JSON")
        return test_cases

    @staticmethod
    def _save_debug_response(response_text: str, error_type: str) -> None:
        """
        Save the response text to a debug file for analysis.

        Args:
            response_text (str): The response text to save
            error_type (str): Type of error for filename
        """
        try:
            os.makedirs("debug", exist_ok=True)
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = f"debug/llm_response_{timestamp}_{error_type}.txt"

            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"LLM Response Debug Information\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Error Type: {error_type}\n")
                f.write(f"Response Length: {len(response_text)}\n")
                f.write("=" * 50 + "\n\n")
                f.write("Raw Response:\n")
                f.write(response_text)

            print(f"💾 Debug response saved to: {filename}")
        except Exception as e:
            print(f"⚠️  Could not save debug response: {e}")

  
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