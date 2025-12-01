"""
JSON extraction utilities for processing LLM responses.
"""

import json
import os
import re
import time
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Import the enhanced data validator and repairer
try:
    from ..utils.data_validator_repairer import DataValidatorRepairer
except ImportError:
    # Fallback for different import paths
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'utils'))
    from data_validator_repairer import DataValidatorRepairer


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
    def extract_test_cases_from_json(data: Dict[str, Any], validate_and_repair: bool = True) -> list:
        """
        Extract test cases list from JSON data with optional validation and repair.

        Args:
            data (Dict[str, Any]): JSON data containing test cases
            validate_and_repair (bool): Whether to validate and repair the test cases

        Returns:
            list: List of validated and repaired test cases
        """
        # Try multiple key names for flexibility
        test_cases = None
        for key in ['test_cases', 'test_points', 'cases', 'items']:
            if key in data:
                test_cases = data[key]
                logger.info(f"Found test cases using key '{key}': {len(test_cases) if isinstance(test_cases, list) else 'not a list'}")
                break

        if test_cases is None:
            logger.warning("No test cases array found in response, creating empty list")
            test_cases = []

        # Convert to list if it's a single object
        if isinstance(test_cases, dict):
            test_cases = [test_cases]
            logger.info("Converted single test case object to list")

        # Validate and repair if requested
        if validate_and_repair and isinstance(test_cases, list):
            validator = DataValidatorRepairer()
            repaired_cases = validator.validate_and_repair_test_cases_batch(test_cases)

            # Log processing summary
            summary = validator.get_processing_summary()
            logger.info(f"Validation complete: {summary['total_cases_processed']} cases, "
                       f"{summary['cases_with_missing_fields']} with missing fields, "
                       f"{summary['cases_with_type_errors']} with type errors, "
                       f"success rate: {summary['success_rate']:.1f}%")

            return repaired_cases

        return test_cases if isinstance(test_cases, list) else []

    @staticmethod
    def extract_and_validate_json_response(response_text: str, validate_and_repair: bool = True, ai_logger=None) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Extract JSON from response and validate/repair test cases.

        Args:
            response_text (str): Raw response text from LLM
            validate_and_repair (bool): Whether to validate and repair the test cases
            ai_logger: AI日志记录器实例

        Returns:
            tuple: (json_data, validated_test_cases)
        """
        extraction_start = time.time()
        logger.info(f"[JSON_EXTRACTOR] Starting extraction from response_text (type: {type(response_text)})")

        # 记录提取步骤数据
        extraction_steps = {
            "input_length": len(response_text),
            "input_type": str(type(response_text)),
            "validate_and_repair": validate_and_repair,
            "steps": []
        }

        # Extract JSON using existing method
        json_data = JSONExtractor.extract_json_from_response(response_text)
        extraction_steps["steps"].append({
            "step": "raw_extraction",
            "success": json_data is not None,
            "result_type": str(type(json_data)),
            "result_preview": str(json_data)[:200] if json_data else None
        })

        logger.info(f"[JSON_EXTRACTOR] Extracted json_data type: {type(json_data)}")

        if not json_data:
            logger.warning("[JSON_EXTRACTOR] Failed to extract JSON from response")
            extraction_steps["steps"].append({
                "step": "validation_failed",
                "success": False,
                "error": "Failed to extract JSON from response"
            })

            # 记录提取失败的情况
            if ai_logger:
                ai_logger.log_json_extraction_steps(extraction_steps)
                ai_logger.log_ai_response_extracted({"error": "Failed to extract JSON", "raw_response": response_text[:1000]})

            return {}, []

        # Validate and repair test cases
        test_cases = JSONExtractor.extract_test_cases_from_json(json_data, validate_and_repair)
        extraction_steps["steps"].append({
            "step": "test_cases_extraction",
            "success": True,
            "test_cases_count": len(test_cases),
            "validate_and_repair_applied": validate_and_repair
        })

        logger.info(f"[JSON_EXTRACTOR] Extracted test_cases count: {len(test_cases)}")

        # Update json_data with repaired test cases
        # Ensure json_data is a dictionary before assignment
        logger.info(f"[JSON_EXTRACTOR] About to assign test_cases to json_data")
        logger.info(f"[JSON_EXTRACTOR] json_data before assignment - type: {type(json_data)}, hasattr(__dict__): {hasattr(json_data, '__dict__')}")

        if hasattr(json_data, '__dict__'):
            # It's a Pydantic model, convert to dict first
            logger.warning(f"[JSON_EXTRACTOR] json_data is a {type(json_data)}, converting to dict")
            json_data = json_data.model_dump() if hasattr(json_data, 'model_dump') else json_data.dict()
            logger.info(f"[JSON_EXTRACTOR] After conversion - json_data type: {type(json_data)}")

        if not isinstance(json_data, dict):
            logger.error(f"[JSON_EXTRACTOR] json_data is not a dict: {type(json_data)}")
            json_data = {}

        logger.info(f"[JSON_EXTRACTOR] Performing assignment: json_data['test_cases'] = test_cases")
        json_data['test_cases'] = test_cases
        logger.info(f"[JSON_EXTRACTOR] Assignment completed successfully")

        # 完成提取步骤记录
        extraction_time = time.time() - extraction_start
        extraction_steps["extraction_time"] = extraction_time
        extraction_steps["final_result"] = {
            "success": True,
            "json_data_keys": list(json_data.keys()) if isinstance(json_data, dict) else [],
            "test_cases_count": len(test_cases),
            "final_test_cases_sample": test_cases[:1] if test_cases else []  # 记录第一个测试用例作为样本
        }
        extraction_steps["steps"].append({
            "step": "final_assignment",
            "success": True,
            "extraction_time": extraction_time
        })

        # 记录AI日志
        if ai_logger:
            ai_logger.log_json_extraction_steps(extraction_steps)
            ai_logger.log_ai_response_extracted(json_data)
            ai_logger.log_ai_response_validated({
                "test_cases": test_cases,
                "count": len(test_cases),
                "extraction_time": extraction_time
            })

        return json_data, test_cases

    @staticmethod
    def validate_json_structure(data: Dict[str, Any], required_key: str = "test_cases") -> bool:
        """
        Enhanced JSON structure validation with repair capability check.

        Args:
            data (Dict[str, Any]): JSON data to validate
            required_key (str): Required key to check for (with alternatives)

        Returns:
            bool: True if structure is valid or can be repaired
        """
        if not isinstance(data, dict):
            return False

        # Check for required key or alternatives
        keys_to_check = [required_key]
        if required_key == "test_cases":
            keys_to_check.extend(['test_points', 'cases', 'items'])

        for key in keys_to_check:
            if key in data:
                test_cases = data[key]
                if isinstance(test_cases, list) or isinstance(test_cases, dict):
                    return True

        return False

  