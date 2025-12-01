# -*- coding: utf-8 -*-
"""
Enhanced JSON field validators for unified test case system.
Provides comprehensive JSON schema validation with detailed error messages.
"""

from typing import Any, List, Dict, Optional
from pydantic import field_validator, ValidationError
import json
import re
import logging

logger = logging.getLogger(__name__)


class JSONFieldValidator:
    """Comprehensive JSON field validator for test case data."""

    @staticmethod
    def validate_preconditions(v: Optional[str]) -> Optional[str]:
        """
        Validate preconditions field with comprehensive checks.

        Args:
            v: Precondition string or None

        Returns:
            Validated precondition string or None

        Raises:
            ValueError: If validation fails
        """
        if v is None:
            return None

        if not isinstance(v, str):
            raise ValueError("前置条件必须是字符串类型")

        # Remove leading/trailing whitespace
        v = v.strip()

        if not v:
            return None  # Return None for empty strings

        if len(v) > 5000:
            raise ValueError("前置条件长度不能超过5000字符")

        return v

    @staticmethod
    def validate_steps(v: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        """
        Validate steps field with comprehensive JSON schema validation.

        Args:
            v: List of step dictionaries or None

        Returns:
            Validated list of steps or None

        Raises:
            ValueError: If validation fails
        """
        if v is None:
            return None

        if not isinstance(v, list):
            raise ValueError("执行步骤必须是数组格式")

        if len(v) > 100:
            raise ValueError("执行步骤数量不能超过100个")

        validated_steps = []
        seen_numbers = set()

        for i, step in enumerate(v):
            if not isinstance(step, dict):
                raise ValueError(f"步骤 {i+1} 必须是对象格式")

            # Validate step_number
            if 'step_number' not in step:
                raise ValueError(f"步骤 {i+1} 缺少 step_number 字段")

            step_number = step['step_number']
            if not isinstance(step_number, int):
                raise ValueError(f"步骤 {i+1} 的 step_number 必须是整数")

            if step_number < 1:
                raise ValueError(f"步骤 {i+1} 的 step_number 必须大于0")

            if step_number > 999:
                raise ValueError(f"步骤 {i+1} 的 step_number 不能超过999")

            if step_number in seen_numbers:
                raise ValueError(f"步骤序号 {step_number} 重复")

            seen_numbers.add(step_number)

            # Validate action
            if 'action' not in step:
                raise ValueError(f"步骤 {i+1} 缺少 action 字段")

            action = step['action']
            if not isinstance(action, str):
                raise ValueError(f"步骤 {i+1} 的 action 必须是字符串")

            action = action.strip()
            if not action:
                raise ValueError(f"步骤 {i+1} 的 action 不能为空")

            if len(action) > 2000:
                raise ValueError(f"步骤 {i+1} 的 action 长度不能超过2000字符")

            # 简化action校验 - 只要求非空即可，允许简单字符描述

            # Validate expected (optional but recommended)
            expected = step.get('expected')
            if expected is not None:
                if not isinstance(expected, str):
                    raise ValueError(f"步骤 {i+1} 的 expected 必须是字符串")

                expected = expected.strip()
                if not expected:
                    raise ValueError(f"步骤 {i+1} 的 expected 不能为空字符串")

                if len(expected) > 2000:
                    raise ValueError(f"步骤 {i+1} 的 expected 长度不能超过2000字符")

                step['expected'] = expected

            # 验证额外字段
            allowed_fields = {'step_number', 'action', 'expected'}
            extra_fields = set(step.keys()) - allowed_fields
            if extra_fields:
                raise ValueError(f"步骤 {i+1} 包含不允许的字段: {', '.join(extra_fields)}")

            validated_steps.append({
                'step_number': step_number,
                'action': action,
                'expected': step['expected']
            })

        # 按step_number排序
        validated_steps.sort(key=lambda x: x['step_number'])

        return validated_steps

    @staticmethod
    def validate_expected_result(v: Optional[List[str]]) -> Optional[List[str]]:
        """
        Validate expected_result field with comprehensive checks.

        Args:
            v: List of expected result strings or None

        Returns:
            Validated list of expected results or None

        Raises:
            ValueError: If validation fails
        """
        if v is None:
            return None

        if not isinstance(v, list):
            raise ValueError("预期结果必须是数组格式")

        if len(v) > 20:
            raise ValueError("预期结果数量不能超过20个")

        validated_results = []
        for i, result in enumerate(v):
            if not isinstance(result, str):
                raise ValueError(f"预期结果 {i+1} 必须是字符串类型")

            result = result.strip()
            if not result:
                raise ValueError(f"预期结果 {i+1} 不能为空字符串")

            if len(result) > 1000:
                raise ValueError(f"预期结果 {i+1} 长度不能超过1000字符")

            # 简化结果校验 - 只要求非空即可，允许简单字符描述

            validated_results.append(result)

        return validated_results

    @staticmethod
    def validate_json_string(v: Optional[str], field_name: str = "JSON字段") -> Optional[Dict[str, Any]]:
        """
        Validate JSON string format and parse it.

        Args:
            v: JSON string or None
            field_name: Field name for error messages

        Returns:
            Parsed JSON object or None

        Raises:
            ValueError: If JSON parsing fails
        """
        if v is None or v.strip() == "":
            return None

        try:
            parsed = json.loads(v)
            if not isinstance(parsed, dict):
                raise ValueError(f"{field_name}必须是JSON对象格式")
            return parsed
        except json.JSONDecodeError as e:
            raise ValueError(f"{field_name}JSON格式错误: {str(e)}")

    @staticmethod
    def validate_additional_context(v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Validate additional_context field.

        Args:
            v: Additional context dictionary or None

        Returns:
            Validated context dictionary or None

        Raises:
            ValueError: If validation fails
        """
        if v is None:
            return None

        if not isinstance(v, dict):
            raise ValueError("additional_context 必须是对象格式")

        if len(v) > 20:
            raise ValueError("additional_context 键数量不能超过20个")

        validated_context = {}
        for key, value in v.items():
            if not isinstance(key, str):
                raise ValueError(f"additional_context 键必须是字符串类型")

            if len(key) > 100:
                raise ValueError(f"additional_context 键 '{key}' 长度不能超过100字符")

            # 验证值的类型和大小
            if isinstance(value, str):
                if len(value) > 5000:
                    raise ValueError(f"additional_context['{key}'] 字符串长度不能超过5000字符")
            elif isinstance(value, (list, dict)):
                if len(str(value)) > 10000:
                    raise ValueError(f"additional_context['{key}'] 复杂对象长度不能超过10000字符")

            validated_context[key] = value

        return validated_context


def create_comprehensive_validators():
    """
    Create comprehensive field validators for Pydantic models.

    Returns:
        Dictionary of validator functions
    """
    return {
        'preconditions': JSONFieldValidator.validate_preconditions,
        'steps': JSONFieldValidator.validate_steps,
        'expected_result': JSONFieldValidator.validate_expected_result,
        'additional_context': JSONFieldValidator.validate_additional_context
    }


# 预定义的JSON Schema
STEPS_JSON_SCHEMA = {
    "type": "array",
    "maxItems": 100,
    "items": {
        "type": "object",
        "required": ["step_number", "action"],
        "properties": {
            "step_number": {
                "type": "integer",
                "minimum": 1,
                "maximum": 999
            },
            "action": {
                "type": "string",
                "minLength": 1,
                "maxLength": 2000
            },
            "expected": {
                "type": "string",
                "maxLength": 1000
            }
        },
        "additionalProperties": False
    }
}

PRECONDITIONS_JSON_SCHEMA = {
    "type": "array",
    "maxItems": 50,
    "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500
    }
}

EXPECTED_RESULT_JSON_SCHEMA = {
    "type": "array",
    "maxItems": 20,
    "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1000
    }
}