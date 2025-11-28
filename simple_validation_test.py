#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple test of enhanced JSON validation in Pydantic models.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.unified_test_case import UnifiedTestCaseCreate
from pydantic import ValidationError

def test_validation():
    """Test the enhanced validation directly."""

    print("=== Testing Enhanced JSON Validation ===")
    print()

    # Test 1: Valid data
    print("Test 1: Valid data")
    valid_data = {
        "name": "Test Case",
        "description": "Test case description",
        "business_type": "RCC",
        "project_id": 1,
        "test_case_id": "TC001",
        "priority": "medium",
        "steps": [
            {
                "step_number": 1,
                "action": "Open login page",
                "expected": "Page displays correctly"
            },
            {
                "step_number": 2,
                "action": "Enter username and password"
            }
        ],
        "preconditions": [
            "User is logged in",
            "System is running"
        ],
        "expected_result": [
            "Login successful",
            "Redirect to main page"
        ]
    }

    try:
        test_case = UnifiedTestCaseCreate(**valid_data)
        print("PASS: Valid data validation succeeded")
        print(f"  - Steps count: {len(test_case.steps)}")
        print(f"  - Preconditions count: {len(test_case.preconditions)}")
        print(f"  - Expected results count: {len(test_case.expected_result)}")
    except ValidationError as e:
        print(f"FAIL: Valid data validation failed: {e}")

    print()

    # Test 2: Invalid step action (empty string)
    print("Test 2: Invalid step action (empty string)")
    invalid_step_data = {
        "name": "Test Case",
        "description": "Test case description",
        "business_type": "RCC",
        "project_id": 1,
        "test_case_id": "TC002",
        "priority": "medium",
        "steps": [
            {
                "step_number": 1,
                "action": "",  # Empty string should trigger validation error
                "expected": "Should fail"
            }
        ]
    }

    try:
        test_case = UnifiedTestCaseCreate(**invalid_step_data)
        print("FAIL: Invalid data validation should have thrown error")
    except ValidationError as e:
        print("PASS: Invalid data validation correctly triggered error")
        error_msg = str(e)
        if "action" in error_msg and ("empty" in error_msg or "空" in error_msg):
            print("  - Error message correct: step action cannot be empty")
        else:
            print(f"  - Error message: {error_msg}")

    print()

    # Test 3: Duplicate step numbers
    print("Test 3: Duplicate step numbers")
    duplicate_step_data = {
        "name": "Test Case",
        "description": "Test case description",
        "business_type": "RCC",
        "project_id": 1,
        "test_case_id": "TC003",
        "priority": "medium",
        "steps": [
            {
                "step_number": 1,
                "action": "First step",
                "expected": "First result"
            },
            {
                "step_number": 1,  # Duplicate step number
                "action": "Second step",
                "expected": "Second result"
            }
        ]
    }

    try:
        test_case = UnifiedTestCaseCreate(**duplicate_step_data)
        print("FAIL: Duplicate step numbers validation should have thrown error")
    except ValidationError as e:
        print("PASS: Duplicate step numbers validation correctly triggered error")
        error_msg = str(e)
        if "重复" in error_msg or "duplicate" in error_msg.lower():
            print("  - Error message correct: step numbers are duplicate")
        else:
            print(f"  - Error message: {error_msg}")

    print()

    # Test 4: Too many preconditions
    print("Test 4: Too many preconditions (over 50)")
    too_many_preconditions = {
        "name": "Test Case",
        "description": "Test case description",
        "business_type": "RCC",
        "project_id": 1,
        "test_case_id": "TC004",
        "priority": "medium",
        "preconditions": [f"Condition {i+1}" for i in range(51)]  # 51 conditions, over limit
    }

    try:
        test_case = UnifiedTestCaseCreate(**too_many_preconditions)
        print("FAIL: Too many preconditions validation should have thrown error")
    except ValidationError as e:
        print("PASS: Too many preconditions validation correctly triggered error")
        error_msg = str(e)
        if "50" in error_msg or ("precondition" in error_msg and "exceed" in error_msg):
            print("  - Error message correct: preconditions exceed limit")
        else:
            print(f"  - Error message: {error_msg}")

    print()
    print("=== JSON Validation Tests Complete ===")

if __name__ == "__main__":
    test_validation()