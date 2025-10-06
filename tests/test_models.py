"""
Test model functionality.
"""

import sys
import os

# Add project root to path for testing
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from src.models.test_case import TestCase, TestCaseCollection, ExcelRow


def test_test_case_creation():
    """Test that TestCase can be created."""
    case = TestCase(
        id="test-001",
        name="Test Case",
        module="auth",
        steps=["Step 1", "Step 2"],
        expected_result=["Result 1", "Result 2"]
    )
    assert case.id == "test-001"
    assert case.name == "Test Case"
    assert len(case.steps) == 2
    print("TestCase creation test passed")


def test_test_case_collection():
    """Test TestCaseCollection functionality."""
    collection = TestCaseCollection()
    case = TestCase(
        id="test-002",
        name="Test Case 2",
        module="payment",
        steps=["Step 1"],
        expected_result=["Result 1"]
    )
    collection.add_test_case(case)
    assert len(collection.test_cases) == 1
    assert collection.get_test_case_by_id("test-002") is not None
    print("TestCaseCollection test passed")


def test_excel_row():
    """Test ExcelRow model."""
    row = ExcelRow(
        ID="test-003",
        用例名称="Excel Test",
        所属模块="excel"
    )
    assert row.ID == "test-003"
    assert row.用例名称 == "Excel Test"
    print("ExcelRow test passed")


if __name__ == "__main__":
    test_test_case_creation()
    test_test_case_collection()
    test_excel_row()
    print("All model tests passed!")