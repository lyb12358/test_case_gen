# -*- coding: utf-8 -*-
"""
Test cases for enhanced JSON field validators.
"""

import pytest
from src.validators.json_validators import JSONFieldValidator


class TestJSONFieldValidator:
    """Test JSON field validator functionality."""

    def test_validate_preconditions_valid(self):
        """Test valid preconditions."""
        valid_data = [
            "用户已登录系统",
            "数据库连接正常",
            "相关服务已启动"
        ]
        result = JSONFieldValidator.validate_preconditions(valid_data)
        assert result == valid_data

    def test_validate_preconditions_empty(self):
        """Test None preconditions."""
        result = JSONFieldValidator.validate_preconditions(None)
        assert result is None

    def test_validate_preconditions_invalid_format(self):
        """Test invalid preconditions format."""
        with pytest.raises(ValueError, match="前置条件必须是数组格式"):
            JSONFieldValidator.validate_preconditions("invalid")

    def test_validate_preconditions_too_many_items(self):
        """Test too many precondition items."""
        data = ["condition"] * 51  # 51 items, max is 50
        with pytest.raises(ValueError, match="前置条件数量不能超过50个"):
            JSONFieldValidator.validate_preconditions(data)

    def test_validate_preconditions_empty_string(self):
        """Test empty string in preconditions."""
        data = ["valid condition", "", "another valid"]
        with pytest.raises(ValueError, match="前置条件 2 不能为空字符串"):
            JSONFieldValidator.validate_preconditions(data)

    def test_validate_steps_valid(self):
        """Test valid steps."""
        valid_data = [
            {
                "step_number": 1,
                "action": "打开登录页面",
                "expected": "页面正常显示"
            },
            {
                "step_number": 2,
                "action": "输入用户名和密码",
                "expected": "输入成功"
            }
        ]
        result = JSONFieldValidator.validate_steps(valid_data)
        assert len(result) == 2
        assert result[0]["step_number"] == 1
        assert result[0]["action"] == "打开登录页面"
        assert result[0]["expected"] == "页面正常显示"

    def test_validate_steps_empty(self):
        """Test None steps."""
        result = JSONFieldValidator.validate_steps(None)
        assert result is None

    def test_validate_steps_missing_fields(self):
        """Test steps with missing required fields."""
        invalid_data = [
            {
                "step_number": 1,
                "action": "test action"
                # missing expected field (should be ok, will default to empty string)
            },
            {
                "action": "test action 2"
                # missing step_number field
            }
        ]
        with pytest.raises(ValueError, match="步骤 2 缺少 step_number 字段"):
            JSONFieldValidator.validate_steps(invalid_data)

    def test_validate_steps_duplicate_numbers(self):
        """Test steps with duplicate step numbers."""
        invalid_data = [
            {
                "step_number": 1,
                "action": "first step",
                "expected": "first result"
            },
            {
                "step_number": 1,
                "action": "second step",
                "expected": "second result"
            }
        ]
        with pytest.raises(ValueError, match="步骤序号 1 重复"):
            JSONFieldValidator.validate_steps(invalid_data)

    def test_validate_steps_invalid_action(self):
        """Test steps with invalid action."""
        invalid_data = [
            {
                "step_number": 1,
                "action": "",  # empty action
                "expected": "some result"
            }
        ]
        with pytest.raises(ValueError, match="步骤 1 的 action 不能为空"):
            JSONFieldValidator.validate_steps(invalid_data)

    def test_validate_expected_result_valid(self):
        """Test valid expected results."""
        valid_data = [
            "操作成功完成",
            "页面显示正确内容",
            "数据保存成功"
        ]
        result = JSONFieldValidator.validate_expected_result(valid_data)
        assert result == valid_data

    def test_validate_expected_result_empty(self):
        """Test None expected result."""
        result = JSONFieldValidator.validate_expected_result(None)
        assert result is None

    def test_validate_expected_result_too_many_items(self):
        """Test too many expected result items."""
        data = ["result"] * 21  # 21 items, max is 20
        with pytest.raises(ValueError, match="预期结果数量不能超过20个"):
            JSONFieldValidator.validate_expected_result(data)

    def test_validate_additional_context_valid(self):
        """Test valid additional context."""
        valid_data = {
            "environment": "test",
            "browser": "chrome",
            "timeout": 30,
            "custom_settings": {
                "enable_logging": True
            }
        }
        result = JSONFieldValidator.validate_additional_context(valid_data)
        assert result == valid_data

    def test_validate_additional_context_empty(self):
        """Test None additional context."""
        result = JSONFieldValidator.validate_additional_context(None)
        assert result is None

    def test_validate_additional_context_invalid_format(self):
        """Test invalid additional context format."""
        with pytest.raises(ValueError, match="additional_context 必须是对象格式"):
            JSONFieldValidator.validate_additional_context("invalid")

    def test_validate_additional_context_too_many_keys(self):
        """Test too many keys in additional context."""
        data = {f"key_{i}": f"value_{i}" for i in range(21)}  # 21 keys, max is 20
        with pytest.raises(ValueError, match="additional_context 键数量不能超过20个"):
            JSONFieldValidator.validate_additional_context(data)

    def test_validate_json_string_valid(self):
        """Test valid JSON string."""
        json_str = '{"key": "value", "number": 123}'
        result = JSONFieldValidator.validate_json_string(json_str)
        assert result == {"key": "value", "number": 123}

    def test_validate_json_string_invalid(self):
        """Test invalid JSON string."""
        invalid_json = '{"key": "value"'  # missing closing brace
        with pytest.raises(ValueError, match="JSON格式错误"):
            JSONFieldValidator.validate_json_string(invalid_json)

    def test_validate_json_string_empty(self):
        """Test empty JSON string."""
        result = JSONFieldValidator.validate_json_string("")
        assert result is None

    def test_steps_sorted_by_number(self):
        """Test that steps are sorted by step_number."""
        unsorted_data = [
            {
                "step_number": 3,
                "action": "third step",
                "expected": "third result"
            },
            {
                "step_number": 1,
                "action": "first step",
                "expected": "first result"
            },
            {
                "step_number": 2,
                "action": "second step",
                "expected": "second result"
            }
        ]
        result = JSONFieldValidator.validate_steps(unsorted_data)
        assert result[0]["step_number"] == 1
        assert result[1]["step_number"] == 2
        assert result[2]["step_number"] == 3

    def test_steps_extra_fields_removed(self):
        """Test that extra fields are removed from steps."""
        data_with_extra = [
            {
                "step_number": 1,
                "action": "test step",
                "expected": "test result",
                "extra_field": "should be removed",
                "another_extra": 123
            }
        ]
        with pytest.raises(ValueError, match="包含不允许的字段"):
            JSONFieldValidator.validate_steps(data_with_extra)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])