#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Direct test of enhanced JSON validation in Pydantic models.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.unified_test_case import UnifiedTestCaseCreate
from pydantic import ValidationError

def test_validation():
    """Test the enhanced validation directly."""

    print("=== 测试增强的JSON字段验证 ===\n")

    # Test 1: Valid data
    print("测试1: 有效数据")
    valid_data = {
        "name": "测试用例",
        "description": "测试用例描述",
        "business_type": "RCC",
        "project_id": 1,
        "test_case_id": "TC001",
        "priority": "medium",
        "steps": [
            {
                "step_number": 1,
                "action": "打开登录页面",
                "expected": "页面正常显示"
            },
            {
                "step_number": 2,
                "action": "输入用户名和密码"
            }
        ],
        "preconditions": [
            "用户已登录",
            "系统正常运行"
        ],
        "expected_result": [
            "登录成功",
            "跳转到主页面"
        ]
    }

    try:
        test_case = UnifiedTestCaseCreate(**valid_data)
        print("✅ 有效数据验证通过")
        print(f"   - 步骤数量: {len(test_case.steps)}")
        print(f"   - 前置条件数量: {len(test_case.preconditions)}")
        print(f"   - 预期结果数量: {len(test_case.expected_result)}")
    except ValidationError as e:
        print(f"❌ 有效数据验证失败: {e}")

    print()

    # Test 2: Invalid step action (empty string)
    print("测试2: 无效步骤动作 (空字符串)")
    invalid_step_data = {
        "name": "测试用例",
        "description": "测试用例描述",
        "business_type": "RCC",
        "project_id": 1,
        "test_case_id": "TC002",
        "priority": "medium",
        "steps": [
            {
                "step_number": 1,
                "action": "",  # 空字符串，应该触发验证错误
                "expected": "应该失败"
            }
        ]
    }

    try:
        test_case = UnifiedTestCaseCreate(**invalid_step_data)
        print("❌ 无效数据验证失败 (应该抛出错误)")
    except ValidationError as e:
        print("✅ 无效数据验证正确触发错误")
        error_msg = str(e)
        if "action 不能为空" in error_msg:
            print("   - 错误信息正确: 步骤action不能为空")
        else:
            print(f"   - 错误信息: {error_msg}")

    print()

    # Test 3: Duplicate step numbers
    print("测试3: 重复步骤序号")
    duplicate_step_data = {
        "name": "测试用例",
        "description": "测试用例描述",
        "business_type": "RCC",
        "project_id": 1,
        "case_id": "TC003",
        "priority": "medium",
        "steps": [
            {
                "step_number": 1,
                "action": "第一个步骤",
                "expected": "第一个结果"
            },
            {
                "step_number": 1,  # 重复的步骤序号
                "action": "第二个步骤",
                "expected": "第二个结果"
            }
        ]
    }

    try:
        test_case = UnifiedTestCaseCreate(**duplicate_step_data)
        print("❌ 重复步骤序号验证失败 (应该抛出错误)")
    except ValidationError as e:
        print("✅ 重复步骤序号验证正确触发错误")
        error_msg = str(e)
        if "步骤序号" in error_msg and "重复" in error_msg:
            print("   - 错误信息正确: 步骤序号重复")
        else:
            print(f"   - 错误信息: {error_msg}")

    print()

    # Test 4: Too many preconditions
    print("测试4: 前置条件数量过多 (超过50个)")
    too_many_preconditions = {
        "name": "测试用例",
        "description": "测试用例描述",
        "business_type": "RCC",
        "project_id": 1,
        "case_id": "TC004",
        "priority": "medium",
        "preconditions": [f"条件 {i+1}" for i in range(51)]  # 51个条件，超过限制
    }

    try:
        test_case = UnifiedTestCaseCreate(**too_many_preconditions)
        print("❌ 前置条件数量验证失败 (应该抛出错误)")
    except ValidationError as e:
        print("✅ 前置条件数量验证正确触发错误")
        error_msg = str(e)
        if "前置条件数量不能超过50个" in error_msg:
            print("   - 错误信息正确: 前置条件数量超过限制")
        else:
            print(f"   - 错误信息: {error_msg}")

    print()

    # Test 5: Invalid additional context (too many keys)
    print("测试5: 额外上下文键过多 (超过20个)")
    too_many_context_keys = {
        "name": "测试用例",
        "description": "测试用例描述",
        "business_type": "RCC",
        "project_id": 1,
        "case_id": "TC005",
        "priority": "medium",
        "additional_context": {f"key_{i+1}": f"value_{i+1}" for i in range(21)}  # 21个键，超过限制
    }

    try:
        test_case = UnifiedTestCaseCreate(**too_many_context_keys)
        print("❌ 额外上下文键数量验证失败 (应该抛出错误)")
    except ValidationError as e:
        print("✅ 额外上下文键数量验证正确触发错误")
        error_msg = str(e)
        if "键数量不能超过20个" in error_msg:
            print("   - 错误信息正确: 额外上下文键数量超过限制")
        else:
            print(f"   - 错误信息: {error_msg}")

    print()
    print("=== JSON验证测试完成 ===")

if __name__ == "__main__":
    test_validation()