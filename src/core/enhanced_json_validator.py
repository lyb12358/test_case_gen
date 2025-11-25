# -*- coding: utf-8 -*-
"""
Enhanced JSON validation with detailed error reporting for LLM responses.
"""

import json
import re
import logging
from typing import Optional, Dict, Any, List, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Validation error severity levels."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class JSONValidationError:
    """Represents a JSON validation error with detailed information."""

    def __init__(self, severity: ValidationSeverity, code: str, message: str,
                 line_number: Optional[int] = None, column_number: Optional[int] = None,
                 context: Optional[str] = None, suggestion: Optional[str] = None):
        self.severity = severity
        self.code = code
        self.message = message
        self.line_number = line_number
        self.column_number = column_number
        self.context = context
        self.suggestion = suggestion

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary format."""
        return {
            'severity': self.severity.value,
            'code': self.code,
            'message': self.message,
            'line_number': self.line_number,
            'column_number': self.column_number,
            'context': self.context,
            'suggestion': self.suggestion
        }


class ValidationResult:
    """Result of JSON validation with errors and warnings."""

    def __init__(self, is_valid: bool, data: Optional[Dict[str, Any]] = None):
        self.is_valid = is_valid
        self.data = data
        self.errors: List[JSONValidationError] = []
        self.warnings: List[JSONValidationError] = []
        self.info: List[JSONValidationError] = []

    def add_error(self, error: JSONValidationError):
        """Add an error to the validation result."""
        self.errors.append(error)
        self.is_valid = False

    def add_warning(self, warning: JSONValidationError):
        """Add a warning to the validation result."""
        self.warnings.append(warning)

    def add_info(self, info: JSONValidationError):
        """Add an info message to the validation result."""
        self.info.append(info)

    def has_issues(self) -> bool:
        """Check if there are any issues (errors, warnings, or info)."""
        return bool(self.errors or self.warnings or self.info)

    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the validation result."""
        return {
            'is_valid': self.is_valid,
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'info_count': len(self.info),
            'total_issues': len(self.errors) + len(self.warnings) + len(self.info),
            'errors': [error.to_dict() for error in self.errors],
            'warnings': [warning.to_dict() for warning in self.warnings],
            'info': [info_item.to_dict() for info_item in self.info]
        }


class EnhancedJSONValidator:
    """Enhanced JSON validator with detailed error reporting."""

    def __init__(self):
        self.common_patterns = {
            'missing_comma': r'("[^"]+"|\d+|true|false|null)\s*(?!"\s*[,}\]])\s*("[^"]+"|\d+|true|false|null)',
            'trailing_comma': r',\s*[}\]]',
            'unclosed_quote': r'"[^"\\]*(?:\\.[^"\\]*)*$',
            'unescaped_newline': r'"\s*\n\s*"',
            'invalid_escape': r'\\[^"\\bfnrt\/u]'
        }

    def validate_and_extract_json(
        self,
        response_text: str,
        expected_structure: Optional[str] = None,
        strict_mode: bool = False
    ) -> ValidationResult:
        """
        Validate and extract JSON from LLM response with detailed error reporting.

        Args:
            response_text (str): Raw LLM response text
            expected_structure (Optional[str]): Expected structure type ('test_points', 'test_cases', etc.)
            strict_mode (bool): Whether to use strict validation

        Returns:
            ValidationResult: Detailed validation result
        """
        result = ValidationResult(True)

        # Check for empty response
        if not response_text or not response_text.strip():
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'EMPTY_RESPONSE',
                'Response is empty or contains only whitespace',
                suggestion='Check if the LLM generated any content'
            ))
            return result

        # Try different extraction methods
        extracted_json, extraction_method = self._extract_json_content(response_text)

        if not extracted_json:
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'NO_JSON_FOUND',
                'No valid JSON found in response',
                suggestion='Ensure LLM response contains valid JSON structure'
            ))
            return result

        # Try to parse the JSON
        try:
            parsed_data = json.loads(extracted_json)
            result.data = parsed_data

            # Validate structure
            self._validate_json_structure(
                parsed_data,
                expected_structure,
                result,
                extracted_json,
                strict_mode
            )

        except json.JSONDecodeError as e:
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'JSON_SYNTAX_ERROR',
                f'JSON syntax error: {str(e)}',
                line_number=e.lineno,
                column_number=e.colno,
                context=self._get_error_context(extracted_json, e.lineno, e.colno),
                suggestion=self._get_syntax_suggestion(e, extracted_json)
            ))

            # Try to provide more specific repair suggestions
            self._analyze_json_issues(extracted_json, result)

        return result

    def _extract_json_content(self, response_text: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract JSON content from response using multiple methods."""

        # Method 1: Try parsing entire response as JSON
        try:
            json.loads(response_text)
            return response_text, 'direct'
        except json.JSONDecodeError:
            pass

        # Method 2: Look for JSON code blocks
        patterns = [
            (r'```json\s*(\{.*?\})\s*```', 'code_block'),
            (r'```\s*(\{.*?\})\s*```', 'generic_code_block'),
            (r'```JSON\s*(\{.*?\})\s*```', 'uppercase_code_block'),
        ]

        for pattern, method in patterns:
            match = re.search(pattern, response_text, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1), method

        # Method 3: Look for JSON objects in the text
        json_patterns = [
            (r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', 'nested_object'),
            (r'\{.*?\}', 'simple_object'),
        ]

        for pattern, method in json_patterns:
            matches = re.findall(pattern, response_text, re.DOTALL)
            if matches:
                # Return the largest match
                return max(matches, key=len), method

        return None, None

    def _validate_json_structure(
        self,
        data: Dict[str, Any],
        expected_structure: Optional[str],
        result: ValidationResult,
        raw_json: str,
        strict_mode: bool
    ):
        """Validate JSON structure based on expected format."""

        if expected_structure == 'test_points':
            self._validate_test_points_structure(data, result, strict_mode)
        elif expected_structure == 'test_cases':
            self._validate_test_cases_structure(data, result, strict_mode)
        else:
            # Generic validation
            self._validate_generic_structure(data, result, strict_mode)

        # Check for common structural issues
        self._check_common_issues(data, raw_json, result)

    def _validate_test_points_structure(self, data: Dict[str, Any], result: ValidationResult, strict_mode: bool):
        """Validate test points structure."""

        if 'test_points' not in data:
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'MISSING_TEST_POINTS',
                'Missing required "test_points" field',
                suggestion='Response should contain a "test_points" array'
            ))
            return

        test_points = data['test_points']

        if not isinstance(test_points, list):
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'INVALID_TEST_POINTS_TYPE',
                '"test_points" field must be an array',
                context=f'Got type: {type(test_points).__name__}',
                suggestion='Ensure "test_points" contains a list of test point objects'
            ))
            return

        if not test_points:
            result.add_warning(JSONValidationError(
                ValidationSeverity.WARNING,
                'EMPTY_TEST_POINTS',
                'Test points array is empty',
                suggestion='Check if test point generation was successful'
            ))

        # Validate each test point
        for i, tp in enumerate(test_points):
            self._validate_single_test_point(tp, i, result, strict_mode)

    def _validate_test_cases_structure(self, data: Dict[str, Any], result: ValidationResult, strict_mode: bool):
        """Validate test cases structure."""

        if 'test_cases' not in data:
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'MISSING_TEST_CASES',
                'Missing required "test_cases" field',
                suggestion='Response should contain a "test_cases" array'
            ))
            return

        test_cases = data['test_cases']

        if not isinstance(test_cases, list):
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'INVALID_TEST_CASES_TYPE',
                '"test_cases" field must be an array',
                context=f'Got type: {type(test_cases).__name__}',
                suggestion='Ensure "test_cases" contains a list of test case objects'
            ))
            return

        if not test_cases:
            result.add_warning(JSONValidationError(
                ValidationSeverity.WARNING,
                'EMPTY_TEST_CASES',
                'Test cases array is empty',
                suggestion='Check if test case generation was successful'
            ))

        # Validate each test case
        for i, tc in enumerate(test_cases):
            self._validate_single_test_case(tc, i, result, strict_mode)

    def _validate_single_test_point(self, test_point: Any, index: int, result: ValidationResult, strict_mode: bool):
        """Validate a single test point object."""

        if not isinstance(test_point, dict):
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'INVALID_TEST_POINT_TYPE',
                f'Test point at index {index} is not an object',
                context=f'Got type: {type(test_point).__name__}',
                suggestion='Each test point should be a JSON object'
            ))
            return

        # Check required fields
        required_fields = ['test_point_id', 'title', 'description']
        for field in required_fields:
            if field not in test_point:
                result.add_error(JSONValidationError(
                    ValidationSeverity.ERROR,
                    'MISSING_REQUIRED_FIELD',
                    f'Test point at index {index} missing required field: {field}',
                    suggestion=f'Add the "{field}" field to the test point object'
                ))

        # Check optional fields
        optional_fields = ['business_type', 'priority', 'status']
        for field in optional_fields:
            if field in test_point and not test_point[field]:
                result.add_warning(JSONValidationError(
                    ValidationSeverity.WARNING,
                    'EMPTY_OPTIONAL_FIELD',
                    f'Test point at index {index} has empty optional field: {field}',
                    suggestion=f'Consider providing a value for "{field}"'
                ))

        # Check data types
        if 'test_point_id' in test_point and not isinstance(test_point['test_point_id'], str):
            result.add_warning(JSONValidationError(
                ValidationSeverity.WARNING,
                'INVALID_FIELD_TYPE',
                f'Test point at index {index} has invalid test_point_id type',
                context=f'Expected string, got {type(test_point["test_point_id"]).__name__}',
                suggestion='test_point_id should be a string like "TP001"'
            ))

    def _validate_single_test_case(self, test_case: Any, index: int, result: ValidationResult, strict_mode: bool):
        """Validate a single test case object."""

        if not isinstance(test_case, dict):
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'INVALID_TEST_CASE_TYPE',
                f'Test case at index {index} is not an object',
                context=f'Got type: {type(test_case).__name__}',
                suggestion='Each test case should be a JSON object'
            ))
            return

        # Check required fields
        required_fields = ['id', 'name', 'description', 'steps', 'expected_result']
        for field in required_fields:
            if field not in test_case:
                result.add_error(JSONValidationError(
                    ValidationSeverity.ERROR,
                    'MISSING_REQUIRED_FIELD',
                    f'Test case at index {index} missing required field: {field}',
                    suggestion=f'Add the "{field}" field to the test case object'
                ))

        # Check array fields
        array_fields = ['preconditions', 'steps', 'expected_result']
        for field in array_fields:
            if field in test_case and not isinstance(test_case[field], list):
                result.add_error(JSONValidationError(
                    ValidationSeverity.ERROR,
                    'INVALID_ARRAY_FIELD',
                    f'Test case at index {index} field "{field}" is not an array',
                    context=f'Expected array, got {type(test_case[field]).__name__}',
                    suggestion=f'"{field}" should be an array of strings'
                ))

    def _validate_generic_structure(self, data: Dict[str, Any], result: ValidationResult, strict_mode: bool):
        """Generic JSON structure validation."""

        if not isinstance(data, dict):
            result.add_error(JSONValidationError(
                ValidationSeverity.ERROR,
                'INVALID_ROOT_TYPE',
                'Root element must be a JSON object',
                context=f'Got type: {type(data).__name__}',
                suggestion='Response should contain a JSON object as the root element'
            ))

    def _check_common_issues(self, data: Dict[str, Any], raw_json: str, result: ValidationResult):
        """Check for common JSON issues."""

        # Check for unexpected fields
        if 'test_points' in data:
            expected_tp_fields = {'test_point_id', 'title', 'description', 'business_type', 'priority', 'status'}
            actual_fields = set()

            for tp in data['test_points']:
                if isinstance(tp, dict):
                    actual_fields.update(tp.keys())

            unexpected_fields = actual_fields - expected_tp_fields
            if unexpected_fields:
                result.add_info(JSONValidationError(
                    ValidationSeverity.INFO,
                    'UNEXPECTED_FIELDS',
                    f'Found unexpected fields in test points: {list(unexpected_fields)}',
                    suggestion='These fields will be ignored during processing'
                ))

    def _analyze_json_issues(self, json_text: str, result: ValidationResult):
        """Analyze JSON text for common issues and provide specific suggestions."""

        issues_found = []

        for pattern_name, pattern in self.common_patterns.items():
            matches = re.findall(pattern, json_text)
            if matches:
                issues_found.append(pattern_name)

                if pattern_name == 'missing_comma':
                    result.add_error(JSONValidationError(
                        ValidationSeverity.ERROR,
                        'MISSING_COMMA',
                        'Missing comma between JSON elements',
                        suggestion='Add a comma between array elements or object properties'
                    ))
                elif pattern_name == 'trailing_comma':
                    result.add_error(JSONValidationError(
                        ValidationSeverity.ERROR,
                        'TRAILING_COMMA',
                        'Trailing comma found in JSON',
                        suggestion='Remove the comma before the closing brace or bracket'
                    ))
                elif pattern_name == 'unclosed_quote':
                    result.add_error(JSONValidationError(
                        ValidationSeverity.ERROR,
                        'UNCLOSED_QUOTE',
                        'Unclosed quote string found',
                        suggestion='Add closing quote mark or escape internal quotes'
                    ))

    def _get_error_context(self, json_text: str, line_number: int, column_number: int, context_lines: int = 2) -> Optional[str]:
        """Get context around the error location."""

        if not line_number or not column_number:
            return None

        lines = json_text.split('\n')

        start_line = max(0, line_number - context_lines - 1)
        end_line = min(len(lines), line_number + context_lines)

        context_lines_list = []
        for i in range(start_line, end_line):
            prefix = ">>> " if i == line_number - 1 else "    "
            context_lines_list.append(f"{prefix}{i + 1}: {lines[i]}")

        return '\n'.join(context_lines_list)

    def _get_syntax_suggestion(self, error: json.JSONDecodeError, json_text: str) -> Optional[str]:
        """Get specific suggestion based on error type."""

        error_msg = str(error).lower()

        if 'expecting' in error_msg and 'property name' in error_msg:
            return "Check for missing quotes around property names"
        elif 'expecting' in error_msg and ':' in error_msg:
            return "Check for missing colon after property name"
        elif 'expecting' in error_msg and '}' in error_msg:
            return "Check for missing closing brace"
        elif 'expecting' in error_msg and ']' in error_msg:
            return "Check for missing closing bracket"
        elif 'invalid escape' in error_msg:
            return "Check for invalid escape sequences in strings"
        elif 'control character' in error_msg:
            return "Remove or properly escape control characters in strings"

        return "Check JSON syntax for missing commas, quotes, or brackets"